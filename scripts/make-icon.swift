import AppKit
import Foundation

let args = CommandLine.arguments
guard args.count == 3 else {
  fputs("usage: make-icon.swift <favicon.svg> <out.png>\n", stderr)
  exit(1)
}

let svgURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
guard let svg = NSImage(contentsOf: svgURL), svg.size.width > 0, svg.size.height > 0 else {
  fputs("could not read favicon\n", stderr)
  exit(1)
}

let canvas: CGFloat = 1024
let image = NSImage(size: NSSize(width: canvas, height: canvas))
image.lockFocus()
NSColor(srgbRed: 20 / 255, green: 20 / 255, blue: 20 / 255, alpha: 1).setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: canvas, height: canvas)).fill()

let margin: CGFloat = 150
let box = NSRect(x: margin, y: margin, width: canvas - margin * 2, height: canvas - margin * 2)
let aspect = svg.size.width / svg.size.height
var draw = box
if aspect >= 1 {
  let height = box.width / aspect
  draw = NSRect(x: box.minX, y: box.midY - height / 2, width: box.width, height: height)
} else {
  let width = box.height * aspect
  draw = NSRect(x: box.midX - width / 2, y: box.minY, width: width, height: box.height)
}
svg.draw(in: draw, from: .zero, operation: .sourceOver, fraction: 1)
image.unlockFocus()

guard
  let tiff = image.tiffRepresentation,
  let rep = NSBitmapImageRep(data: tiff),
  let png = rep.representation(using: .png, properties: [:])
else {
  fputs("could not encode icon\n", stderr)
  exit(1)
}
try png.write(to: outURL)
