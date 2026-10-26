# Image Converter CLI

## What It Is

Image Converter CLI converts supported image files to JPG or PNG from the terminal. It can process one file, a folder, or show image metadata without converting.

## Features

- Convert one image or all supported images in a folder.
- Select JPG or PNG output with `--to`.
- Set JPG quality from 1 to 100.
- Choose an output file or directory.
- Inspect format, dimensions, size, channels, color space, DPI, and alpha support with `--info`.
- Protect existing files unless `--overwrite` is supplied.

## Usage

```bash
npm install
npm start -- --help
npm start -- photo.png
npm start -- photo.jpg --to png
npm start -- ./images --all --to png
npm start -- photo.png --info
```

After `npm link`, use `imgconvert`. Input formats include JPG, JPEG, PNG, WebP, TIFF, GIF, BMP, AVIF, HEIC, and HEIF; output is JPG or PNG. PNG transparency is lost when converting to JPG.

## Technology

- Node.js 14 or newer and ES modules
- `sharp` for image decoding and encoding

## Privacy and Safety

Images are processed locally and are not uploaded. The tool reads provided paths and writes selected output files. Review output paths before using `--overwrite`.

## Distribution

Image Converter CLI is distributed as a paid digital product through Gumroad. The product page may contain the current package, releases, and commercial terms.

## License

The source project declares the MIT License. See `package.json` for metadata. Gumroad purchase terms and the MIT License may apply to different parts of the distributed package.

## Status

Version 1.0.0. Supported codecs depend on the installed `sharp` build.