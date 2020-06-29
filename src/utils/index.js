const zsExtract = require("zs-extract");
const {
  homgot
} = require('../api/apiCall');


const imageUrlToBase64 = async (url) => {
  let img = await homgot(url);
  return img.rawBody.toString('base64');
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
