const jwtDecode = require('jwt-decode');

export function humanize(str) {
  return str
    .replace(/^[\s_]+|[\s_]+$/g, '')
    .replace(/[_\s]+/g, ' ')
    .replace(/^[a-z]/, function(m) {
      return m.toUpperCase();
    });
}

export function groupBy(items, key) {
  return items.reduce(
    (result, item) => ({
      ...result,
      [item[key]]: [...(result[item[key]] || []), item]
    }),
    {}
  );
}

export function parseVideoUrl(url) {
  let formattedUrl;

  // FORMAT VIMEO VIDEO URL
  if (
    url.includes('https://player.vimeo.com') ||
    url.includes('https://www.youtube-nocookie.com')
  ) {
    formattedUrl = url;
  }
  if (url.includes('https://vimeo.com/')) {
    const videoId = url.split('https://vimeo.com/')[1];
    formattedUrl = 'https://player.vimeo.com/video/' + videoId;
  }
  // FORMAT YOUTUBE VIDEO URL
  if (url.includes('https://www.youtube.com/watch?v=')) {
    let videoId = url.split('https://www.youtube.com/watch?v=')[1];
    let ampersandPosition = videoId.indexOf('&');
    if (ampersandPosition != -1) {
      videoId = videoId.substring(0, ampersandPosition);
    }
    formattedUrl = 'https://www.youtube-nocookie.com/embed/' + videoId;
  }
  return formattedUrl;
}

export function getNestedProperty(obj, key) {
  return key.split('.').reduce(function(o, x) {
    return typeof o === 'undefined' || o === null ? o : o[x];
  }, obj);
}

export function addProps(obj, arr, val) {
  if (typeof arr === 'string') arr = arr.split('.');

  obj[arr[0]] = obj[arr[0]] || {};

  var tmpObj = obj[arr[0]];

  if (arr.length > 1) {
    arr.shift();
    addProps(tmpObj, arr, val);
  } else obj[arr[0]] = val;

  return obj;
}

export function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function debounce(fn, delay) {
  let timeoutID = null;
  return function() {
    clearTimeout(timeoutID);
    let args = arguments;
    let that = this;
    timeoutID = setTimeout(function() {
      fn.apply(that, args);
    }, delay);
  };
}

export function getCurrentDate() {
  const today = new Date();
  return (
    today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
  );
}

export function getCurrentTime() {
  const today = new Date();
  return today.getHours() + '-' + today.getMinutes() + '-' + today.getSeconds();
}

/**
 * Takes a hex value and prepends a zero if it's a single digit.
 * @param {string} hex Hex value to prepend if single digit.
 * @return {string} hex value prepended with zero if it was single digit,
 *     otherwise the same value that was passed in.
 * @hidden
 */
export function colorZeroPadding(hex) {
  return hex.length === 1 ? `0${hex}` : hex;
}

/**
 * Converts a color from RGB to hex representation.
 * @param {number[]} rgb rgb representation of the color.
 * @return {string} hex representation of the color.
 * @hidden
 */
export function rgbArrayToHex(rgb) {
  const r = rgb[0];
  const g = rgb[1];
  const b = rgb[2];
  if (r !== (r & 255) || g !== (g & 255) || b !== (b & 255)) {
    throw Error(`"(${r},${g},${b})" is not a valid RGB color`);
  }
  const hexR = colorZeroPadding(r.toString(16));
  const hexG = colorZeroPadding(g.toString(16));
  const hexB = colorZeroPadding(b.toString(16));
  return `#${hexR}${hexG}${hexB}`;
}

// helper function to detect a CSS color
// Taken from Vuetify sources
// https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/mixins/colorable.ts
export function isCssColor(color) {
  return !!color && !!color.match(/^(#|(rgb|hsl)a?\()/);
}

export function validateToken(jwtToken) {
  if (!jwtToken) {
    return null;
  }
  const decodedToken = jwtDecode(jwtToken);
  if (
    decodedToken &&
    decodedToken.exp &&
    Date.now() >= decodedToken.exp * 1000
  ) {
    return null;
  } else {
    return decodedToken;
  }
}
