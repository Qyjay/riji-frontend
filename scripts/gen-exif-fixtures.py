"""
生成 EXIF 解析器的测试图片

用 PIL + piexif（与前端解析器完全独立的实现）写入已知的拍摄时间与 GPS，
供 test-exif-parser.js 校验 src/utils/exif-parser.ts 的解析结果。

用法：python scripts/gen-exif-fixtures.py
"""
import json
import os

import piexif
from PIL import Image

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")


def to_dms(value: float) -> tuple:
    """十进制度 -> EXIF 的 度/分/秒 rational 三元组"""
    value = abs(value)
    degrees = int(value)
    minutes_float = (value - degrees) * 60
    minutes = int(minutes_float)
    # 秒保留 4 位小数精度，用 10000 作分母
    seconds = round((minutes_float - minutes) * 60 * 10000)
    return ((degrees, 1), (minutes, 1), (seconds, 10000))


def make_image(path: str, exif_dict: dict | None) -> None:
    img = Image.new("RGB", (32, 32), (200, 120, 80))
    if exif_dict is None:
        img.save(path, "JPEG", quality=80)
    else:
        img.save(path, "JPEG", quality=80, exif=piexif.dump(exif_dict))


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    expectations = {}

    # 1. 拍摄时间 + 北纬东经（南京附近）
    lat, lon = 32.0603, 118.7969
    exif = {
        "0th": {piexif.ImageIFD.DateTime: b"2026:03:15 09:00:00"},
        "Exif": {
            piexif.ExifIFD.DateTimeOriginal: b"2026:03:15 14:30:45",
            piexif.ExifIFD.DateTimeDigitized: b"2026:03:15 14:30:45",
        },
        "GPS": {
            piexif.GPSIFD.GPSLatitudeRef: b"N",
            piexif.GPSIFD.GPSLatitude: to_dms(lat),
            piexif.GPSIFD.GPSLongitudeRef: b"E",
            piexif.GPSIFD.GPSLongitude: to_dms(lon),
        },
        "1st": {},
        "thumbnail": None,
    }
    make_image(os.path.join(OUT_DIR, "with-datetime-gps.jpg"), exif)
    expectations["with-datetime-gps.jpg"] = {
        "takenAtLocal": "2026-03-15 14:30:45",
        "lat": lat,
        "lon": lon,
    }

    # 2. 南纬西经（里约附近），验证 Ref 取负
    lat2, lon2 = -22.9068, -43.1729
    exif2 = {
        "0th": {},
        "Exif": {piexif.ExifIFD.DateTimeOriginal: b"2025:12:24 20:05:00"},
        "GPS": {
            piexif.GPSIFD.GPSLatitudeRef: b"S",
            piexif.GPSIFD.GPSLatitude: to_dms(lat2),
            piexif.GPSIFD.GPSLongitudeRef: b"W",
            piexif.GPSIFD.GPSLongitude: to_dms(lon2),
        },
        "1st": {},
        "thumbnail": None,
    }
    make_image(os.path.join(OUT_DIR, "south-west-gps.jpg"), exif2)
    expectations["south-west-gps.jpg"] = {
        "takenAtLocal": "2025-12-24 20:05:00",
        "lat": lat2,
        "lon": lon2,
    }

    # 3. 只有拍摄时间，没有 GPS
    exif3 = {
        "0th": {},
        "Exif": {piexif.ExifIFD.DateTimeOriginal: b"2024:07:01 08:15:30"},
        "GPS": {},
        "1st": {},
        "thumbnail": None,
    }
    make_image(os.path.join(OUT_DIR, "datetime-only.jpg"), exif3)
    expectations["datetime-only.jpg"] = {
        "takenAtLocal": "2024-07-01 08:15:30",
        "lat": None,
        "lon": None,
    }

    # 4. 只有 IFD0 的 DateTime，没有 DateTimeOriginal（验证兜底路径）
    exif4 = {
        "0th": {piexif.ImageIFD.DateTime: b"2023:05:20 11:22:33"},
        "Exif": {},
        "GPS": {},
        "1st": {},
        "thumbnail": None,
    }
    make_image(os.path.join(OUT_DIR, "ifd0-datetime-only.jpg"), exif4)
    expectations["ifd0-datetime-only.jpg"] = {
        "takenAtLocal": "2023:05:20 11:22:33".replace(":", "-", 2),
        "lat": None,
        "lon": None,
    }

    # 5. 完全没有 EXIF
    make_image(os.path.join(OUT_DIR, "no-exif.jpg"), None)
    expectations["no-exif.jpg"] = {"takenAtLocal": None, "lat": None, "lon": None}

    with open(os.path.join(OUT_DIR, "expectations.json"), "w", encoding="utf-8") as handle:
        json.dump(expectations, handle, ensure_ascii=False, indent=2)

    print(f"生成完成 -> {OUT_DIR}")
    for name in sorted(expectations):
        size = os.path.getsize(os.path.join(OUT_DIR, name))
        print(f"  {name}  {size} bytes")


if __name__ == "__main__":
    main()
