"""
从一张源图生成 App 全套桌面图标

输出到 unpackage/res/icons/，文件名沿用 HBuilderX 图标生成器的约定（<边长>x<边长>.png），
manifest.json 的 app-plus.distribute.icons.android 直接引用其中的 72/96/144/192。

用法：
    python scripts/gen-app-icons.py                 # 用仓库根目录的 icon.png
    python scripts/gen-app-icons.py path/to/xxx.png # 指定源图
"""
import os
import sys

from PIL import Image

FRONTEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(FRONTEND_DIR, "unpackage", "res", "icons")
DEFAULT_SOURCE = os.path.join(os.path.dirname(FRONTEND_DIR), "icon.png")

# 48 是已废弃的 ldpi/mdpi，512 供 Google Play 商店列表页，1024 是母版/App Store
SIZES = (48, 72, 96, 144, 192, 512, 1024)

# HBuilderX 要求源图为 1024x1024，小于此值放大会损失清晰度
REQUIRED_SOURCE_SIZE = 1024


def load_square_source(path: str) -> Image.Image:
    """读入源图并保证是正方形；非正方形时补透明边而不裁剪，避免丢内容"""
    img = Image.open(path).convert("RGBA")
    width, height = img.size
    if width == height:
        return img

    side = max(width, height)
    print(f"警告：源图不是正方形（{width}x{height}），已补透明边到 {side}x{side}，未裁剪任何内容")
    padded = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    padded.paste(img, ((side - width) // 2, (side - height) // 2))
    return padded


def main() -> None:
    source_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SOURCE
    if not os.path.isfile(source_path):
        raise SystemExit(f"源图不存在：{source_path}")

    source = load_square_source(source_path)
    side = source.size[0]
    print(f"源图：{source_path}  {side}x{side}  alpha={'A' in source.getbands()}")
    if side < REQUIRED_SOURCE_SIZE:
        print(f"警告：源图小于 {REQUIRED_SOURCE_SIZE}x{REQUIRED_SOURCE_SIZE}，放大后的大尺寸图标会偏软，建议换一张 1024x1024 原图")

    os.makedirs(OUT_DIR, exist_ok=True)
    for target in SIZES:
        # 每个尺寸都从源图直接重采样，避免经由中间母版二次采样损失细节
        resized = source if target == side else source.resize((target, target), Image.LANCZOS)
        out_path = os.path.join(OUT_DIR, f"{target}x{target}.png")
        resized.save(out_path, "PNG", optimize=True)

    print(f"生成完成 -> {OUT_DIR}")
    failed = []
    for target in SIZES:
        name = f"{target}x{target}.png"
        out_path = os.path.join(OUT_DIR, name)
        with Image.open(out_path) as written:
            actual = written.size
            mode = written.mode
        ok = actual == (target, target)
        if not ok:
            failed.append(f"{name} 实际为 {actual[0]}x{actual[1]}")
        flag = "ok" if ok else "尺寸不符"
        print(f"  {name}  {actual[0]}x{actual[1]}  {mode}  {os.path.getsize(out_path)} bytes  {flag}")

    if failed:
        raise SystemExit("输出校验失败：" + "；".join(failed))


if __name__ == "__main__":
    main()
