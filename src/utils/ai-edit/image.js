function chooseImage(sourceType = ['album']) {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType,
      success: (res) => {
        const pathFromPaths = (res.tempFilePaths && res.tempFilePaths[0]) || '';
        const pathFromFiles = (res.tempFiles && res.tempFiles[0] && (res.tempFiles[0].path || res.tempFiles[0].tempFilePath)) || '';
        const path = pathFromPaths || pathFromFiles || '';
        if (!path) {
          reject(new Error('No image selected'));
          return;
        }
        resolve(path);
      },
      fail: reject
    });
  });
}

function getImageInfo(src) {
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src,
      success: resolve,
      fail: reject
    });
  });
}

function compressIfPossible(src, quality = 70) {
  return new Promise((resolve) => {
    if (!uni.compressImage) {
      resolve(src);
      return;
    }
    uni.compressImage({
      src,
      quality,
      success: (res) => resolve(res.tempFilePath || src),
      fail: () => resolve(src)
    });
  });
}

function exportCanvasToImage(canvasId, width, height, fileType = 'png') {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvasId,
      width,
      height,
      destWidth: width,
      destHeight: height,
      fileType,
      success: resolve,
      fail: reject
    });
  });
}

function saveImageToAlbum(path) {
  return new Promise((resolve, reject) => {
    if (!uni.saveImageToPhotosAlbum) {
      resolve({ unsupported: true, path });
      return;
    }
    uni.saveImageToPhotosAlbum({
      filePath: path,
      success: resolve,
      fail: reject
    });
  });
}

async function importImageWithInfo(sourceType) {
  const rawPath = await chooseImage(sourceType);
  const compressedPath = await compressIfPossible(rawPath, 75);
  let info = null;
  let drawablePath = compressedPath || rawPath;

  try {
    info = await getImageInfo(drawablePath);
  } catch (error) {
    drawablePath = rawPath;
    try {
      info = await getImageInfo(drawablePath);
    } catch (fallbackError) {
      info = {
        width: 0,
        height: 0,
        path: drawablePath
      };
    }
  }

  drawablePath = (info && info.path) || drawablePath || rawPath;
  return {
    path: drawablePath,
    info: {
      ...info,
      path: drawablePath,
      width: Number(info.width || 0),
      height: Number(info.height || 0)
    }
  };
}

export {
  chooseImage,
  getImageInfo,
  compressIfPossible,
  exportCanvasToImage,
  saveImageToAlbum,
  importImageWithInfo
};
