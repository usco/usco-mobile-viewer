export default function detectPlatform () {
  const userAgent = window.navigator.userAgent.toLowerCase()
  const safari = /safari/.test(userAgent)
  const ios = /iphone|ipod|ipad/.test(userAgent)

  if (ios) {
    if (safari) {
      // browser
    } else if (!safari) {
      // webview
    }
    return 'ios'
  } else {
    // not iOS
    return 'android'
  }
}
