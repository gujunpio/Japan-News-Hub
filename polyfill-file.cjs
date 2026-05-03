// polyfill-file.cjs
// Polyfill the browser File API for Node.js build/runtime environments.
// Required because @google/generative-ai references `File` at module load time.
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File {
    constructor(chunks, filename, options) {
      this.name = filename
      this.size = (chunks || []).reduce((acc, c) => acc + (c.byteLength || c.length || 0), 0)
      this.type = (options && options.type) || ''
      this.lastModified = Date.now()
    }
  }
}
