const cheerioTableparser = require('cheerio-tableparser');
const decodeURL = require('urldecode');
const {getInfo, animeInfo, animeExtraInfo, getMALid, urlify, getAllAnimes, imageUrlToBase64} = require('../utils/index');

const {
  homgot
} = require('../api/apiCall');

const {
  BASE_URL, BROWSE_URL, ANIME_VIDEO_URL, BASE_JIKA_URL
} = require('./urls');

const latestAnimeAdded = async() =>
    getInfo(await homgot(`${BASE_URL}`,{ scrapy: true }), { isWithoutBase: true });

const latestEpisodesAdded = async() =>{

  let promises = []
  let $ = await homgot(`${BASE_URL}`, { scrapy: true })

  $('div.Container ul.ListEpisodios li').each((index , element) =>{

    const $element = $(element);
    const id = $element.find('a').attr('href').replace('/ver/' , '').trim();
    const title = $element.find('a strong.Title').text();
    const poster = BASE_URL + $element.find('a span.Image img').attr('src');
    const episode = parseInt($element.find('a span.Capi').text().match(/\d+/g) , 10);

    promises.push(getAnimeServers(id).then(async servers => ({
      id: id || null,
      title: title || null,
      poster: await imageUrlToBase64(poster) || null,
      episode: episode || null,
      servers: servers || null,
    })))

  })

  return await Promise.all(promises);

};

const getAnimeServers = async(id) =>{

  try {

    let $ = await homgot(`${ANIME_VIDEO_URL}${id}`, { scrapy: true })
    const scripts = $('script');
    const servers = [];

    Array.from({length: scripts.length} , (v , k) =>{
      const contents = $(scripts[k]).html();
      if((contents || '').includes('var videos = {')) {
        servers.push(JSON.parse(contents.split('var videos = ')[1].split(';')[0]).SUB)
      }
    });

    return servers[0];

  } catch (e) {
    console.log(e)
  }

};

const animeByGenres = async(data) =>
    getInfo(await homgot(`${BROWSE_URL}genre%5B%5D=${data.genre}&order=${data.order}&page=${data.page}`,{ scrapy: true }));

const special = async(data) =>
    getInfo(await homgot(`${BROWSE_URL}type%5B%5D=${data.category}&order=${data.order}&page=${data.page}`, { scrapy: true }));

const animeByState = async(data) =>
    getInfo(await homgot(`${BROWSE_URL}type%5B%5D=tv&status%5B%5D=${data.state}&order=${data.order}&page=${data.page}`,{ scrapy: true }));

const search = async(query) =>
    getInfo(await homgot(`${BROWSE_URL}q=${query}`,{ scrapy: true }));

const getAnimeCharacters = async(title) =>{

  const matchAnime = await getMALid(title)

  try {
    if(matchAnime !== null) {
      const data = await homgot(`${BASE_JIKA_URL}anime/${matchAnime.mal_id}/characters_staff`, { parse: true });
      return data.characters.map(doc => ({
          id: doc.mal_id,
          name: doc.name,
          image: doc.image_url,
          role: doc.role
      }));
    }
  } catch (err) {
    console.log(err)
  }

};

const getAnimeVideoPromo = async(title) =>{

  const matchAnime = await getMALid(title)

  try {
    if(matchAnime !== null) {
      const data = await homgot(`${BASE_JIKA_URL}anime/${matchAnime.mal_id}/videos`, {parse: true})
      return data.promo.map(doc => ({
        title: doc.title,
        previewImage: doc.image_url,
        videoURL: doc.video_url
      }));
    }
  } catch (err) {
    console.log(err)
  }

};

const getAnimeInfo = async(title) =>{

  let promises = [];
  let animeId = ''
  let animeType = ''
  let animeIndex = ''

  await getAllAnimes().then(animes => {
    for (const i in animes) {
      if (animes[i].title.split('\t')[0] === title.split('\t')[0]) {
        animeId = animes[i].id
        animeIndex = animes[i].index
        animeType = animes[i].type.toLowerCase()
        break;
      }
    }
  });

  try{
    promises.push(await animeInfo(`anime/${animeId}`, animeIndex).then(async extra => ({
      title: title || null,
      poster: await imageUrlToBase64(extra.animeExtraInfo[0].poster) || null,
      banner: extra.animeExtraInfo[0].banner || null,
      synopsis: extra.animeExtraInfo[0].synopsis || null,
      debut: extra.animeExtraInfo[0].debut || null,
      type: extra.animeExtraInfo[0].type || null,
      rating: extra.animeExtraInfo[0].rating || null,
      genres: extra.genres || null,
      episodes: extra.listByEps || null,
      moreInfo: await animeExtraInfo(title).then(info =>{
        return info || null
      }),
      promoList: await getAnimeVideoPromo(title).then(promo =>{
        return promo || null
      }),
      charactersList: await getAnimeCharacters(title).then(characters =>{
        return characters || null
      })
    })));

    return Promise.all(promises);

  }catch(err){
    console.log(err)
  }

};

const downloadLinksByEpsId = async(id) =>{

  let $ = await homgot(`${ANIME_VIDEO_URL}${id}`,{ scrapy: true })
  let $table = $('table.RTbl')

  cheerioTableparser($);
  let tempServerNames = $table.parsetable(true , true , true)[0];
  let serverNames = tempServerNames.filter(x => x !== 'SERVIDOR');
  let urls = [];

  try{

    const data = await urlify($table.html()).then(res => { return res; });
    const tempUrls = [];
    data.map(baseUrl => tempUrls.push(baseUrl.split('"')[0]));
    tempUrls.map(url => decodeURL(url).toString().split('?s=')[1]);

    Array.from({length: tempUrls.length} , (v , k) =>{
      urls.push({
        server: serverNames[k],
        url: tempUrls[k],
      });
    });

    return Promise.all(urls);

  }catch(err){
    console.log(err);
  }

};

module.exports = {
  latestAnimeAdded,
  latestEpisodesAdded,
  getAnimeVideoPromo,
  getAnimeCharacters,
  getAnimeServers,
  animeByGenres,
  animeByState,
  search,
  special,
  getAnimeInfo,
  getAllAnimes,
  downloadLinksByEpsId
};
