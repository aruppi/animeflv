const zsExtract = require("zs-extract");
const base64 = require('node-base64-image');

const imageUrlToBase64 = async (url) => {
  return await base64.encode(url, {string: true});
};

const urlify = async(text) =>{
  const urls = [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  text.replace(urlRegex , (url) =>{
    urls.push(url)
  });
  return Promise.all(urls);
};

const decodeZippyURL = async(url) =>{
  const mp4 = await zsExtract.extract(url);
  return mp4.download;
}


module.exports = {
  imageUrlToBase64,
  urlify,
  decodeZippyURL
}
