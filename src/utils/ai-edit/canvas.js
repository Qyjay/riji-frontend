const DIST_THRESHOLD = 6;

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getBoundingBox(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points.forEach((p) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY)
  };
}

function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

function averageSegmentLength(points) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += distance(points[i - 1], points[i]);
  }
  return total / (points.length - 1);
}

function countDirectionChanges(points) {
  if (points.length < 5) return 0;
  let turns = 0;
  for (let i = 2; i < points.length; i += 1) {
    const a = points[i - 2];
    const b = points[i - 1];
    const c = points[i];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const bcx = c.x - b.x;
    const bcy = c.y - b.y;
    const cross = abx * bcy - aby * bcx;
    if (Math.abs(cross) > 8) turns += 1;
  }
  return turns;
}

function lineStraightness(points) {
  if (points.length < 3) return 1;
  const first = points[0];
  const last = points[points.length - 1];
  const base = distance(first, last) || 1;
  let sum = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const p = points[i];
    const num = Math.abs((last.y - first.y) * p.x - (last.x - first.x) * p.y + last.x * first.y - last.y * first.x);
    sum += num / base;
  }
  return Math.max(0, 1 - sum / (points.length * 18));
}

function detectArrow(points) {
  if (points.length < 7) return null;
  const end = points[points.length - 1];
  const tail = points[Math.max(0, points.length - 5)];
  const beforeTail = points[Math.max(0, points.length - 10)];
  const dir = Math.atan2(end.y - beforeTail.y, end.x - beforeTail.x);
  const wingA = Math.atan2(end.y - tail.y, end.x - tail.x);
  const diff = Math.abs(dir - wingA);
  const len = distance(points[0], end);
  if (len > 45 && diff > 0.3) {
    return {
      type: 'arrow',
      from: points[0],
      to: end,
      speed: Math.min(1, len / 260)
    };
  }
  return null;
}

function isClosedPath(points) {
  if (points.length < 6) return false;
  const box = getBoundingBox(points);
  const closeThreshold = Math.max(14, Math.min(box.width, box.height) * 0.2);
  return distance(points[0], points[points.length - 1]) <= closeThreshold;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-6) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function thinPoints(points) {
  if (points.length < 3) return points.slice();
  const result = [points[0]];
  let last = points[0];
  for (let i = 1; i < points.length; i += 1) {
    if (distance(last, points[i]) >= DIST_THRESHOLD) {
      result.push(points[i]);
      last = points[i];
    }
  }
  if (result[result.length - 1] !== points[points.length - 1]) {
    result.push(points[points.length - 1]);
  }
  return result;
}

function detectSymbol(points) {
  const box = getBoundingBox(points);
  const straight = lineStraightness(points);
  const closed = isClosedPath(points);
  const turns = countDirectionChanges(points);

  if (!closed && straight > 0.88) {
    const first = points[0];
    const last = points[points.length - 1];
    const slope = (last.y - first.y) / ((last.x - first.x) || 1e-6);
    if (Math.abs(slope) > 0.45 && Math.abs(slope) < 2.8) {
      return { type: 'slash-undo', confidence: 0.88, box };
    }
  }

  if (closed && points.length > 24 && box.width < 52 && box.height < 52) {
    return { type: 'vanishing-point', confidence: 0.8, box };
  }

  if (closed && points.length > 15) {
    const area = polygonArea(points);
    const circleArea = Math.PI * (box.width / 2) * (box.height / 2);
    const similarity = area / (circleArea || 1);
    if (similarity > 0.35 && similarity < 1.2 && turns > 22) {
      return { type: 'circle-cross-delete', confidence: 0.78, box };
    }
    if (similarity > 0.6 && similarity < 1.25) {
      return { type: 'sun', confidence: 0.76, box };
    }
  }

  if (!closed && points.length > 12 && box.width > 20 && box.height > 20 && straight < 0.65) {
    return { type: 'moon', confidence: 0.72, box };
  }

  if (closed && points.length > 25 && straight < 0.45) {
    return { type: 'star', confidence: 0.68, box };
  }

  return null;
}

function detectStrokeIntent(points, brush) {
  const thinned = thinPoints(points);
  const box = getBoundingBox(thinned);
  const straightness = lineStraightness(thinned);
  const arrow = detectArrow(thinned);
  if (arrow) return arrow;

  if (brush.gradientEnabled) {
    return {
      type: 'gradient-color',
      box,
      direction: thinned[0].x <= thinned[thinned.length - 1].x ? 'left-to-right' : 'right-to-left'
    };
  }

  if (!isClosedPath(thinned) && straightness > 0.9) {
    return {
      type: 'stretch',
      box,
      axis: Math.abs(thinned[0].x - thinned[thinned.length - 1].x) > Math.abs(thinned[0].y - thinned[thinned.length - 1].y) ? 'x' : 'y'
    };
  }

  if (!isClosedPath(thinned) && straightness < 0.7 && averageSegmentLength(thinned) > 8) {
    return {
      type: 'bend',
      box,
      amount: Math.min(0.5, box.height / 200)
    };
  }

  return {
    type: 'sketch',
    box
  };
}

function getTouchPoint(event, canvasRect) {
  const touch = (event.changedTouches && event.changedTouches[0]) || (event.touches && event.touches[0]) || event.detail || {};
  const rect = canvasRect || { left: 0, top: 0, width: 0, height: 0 };
  const hasPageCoord = typeof touch.pageX === 'number' || typeof touch.clientX === 'number';
  let x;
  let y;

  if (!hasPageCoord && typeof touch.x === 'number' && typeof touch.y === 'number') {
    x = touch.x;
    y = touch.y;
  } else {
    const pageX = typeof touch.pageX === 'number' ? touch.pageX : typeof touch.clientX === 'number' ? touch.clientX : touch.x || 0;
    const pageY = typeof touch.pageY === 'number' ? touch.pageY : typeof touch.clientY === 'number' ? touch.clientY : touch.y || 0;
    x = pageX - (rect.left || 0);
    y = pageY - (rect.top || 0);
  }

  if (typeof rect.width === 'number' && rect.width > 0) {
    x = Math.max(0, Math.min(rect.width, x));
  }
  if (typeof rect.height === 'number' && rect.height > 0) {
    y = Math.max(0, Math.min(rect.height, y));
  }

  return {
    x,
    y,
    t: Date.now()
  };
}

function makeRegionFromPath(points) {
  const poly = thinPoints(points);
  const closed = isClosedPath(poly);
  return {
    id: `region_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    polygon: closed ? poly : poly.concat([poly[0]]),
    closed,
    box: getBoundingBox(poly),
    highlightAlpha: 0.18
  };
}

function fitImageToCanvas(imageInfo, canvasWidth, canvasHeight) {
  if (!imageInfo || !imageInfo.width || !imageInfo.height) {
    return { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
  }
  const scale = Math.min(canvasWidth / imageInfo.width, canvasHeight / imageInfo.height);
  const width = imageInfo.width * scale;
  const height = imageInfo.height * scale;
  return {
    x: (canvasWidth - width) / 2,
    y: (canvasHeight - height) / 2,
    width,
    height
  };
}

export {
  distance,
  getBoundingBox,
  isClosedPath,
  pointInPolygon,
  thinPoints,
  detectSymbol,
  detectStrokeIntent,
  getTouchPoint,
  makeRegionFromPath,
  fitImageToCanvas
};
