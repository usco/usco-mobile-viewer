import bufferToPng from './bufferToPng'

export function contextToBuffer (gl, width, height, depth = 4) {
  let buffer = new Uint8Array(width * height * depth)
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buffer)
  return buffer
}

export function writeBufferToFile (buffer, width, height, path) {
  bufferToPng(buffer, width, height, path)
}

export function writeContextToFile (context, width, height, depth, path = './test.png') {
  let buffer = contextToBuffer(context, width, height, depth)
  writeBufferToFile(buffer, width, height, path)
}
