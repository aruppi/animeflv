const cheerioTableparser = require('cheerio-tableparser');
const decodeURL = require('urldecode');
const {getInfo, animeflvInfo, animeExtraInfo, urlify, imageUrlToBase64} = require('../utils/index');

const {
  homgot
} = require('../api/apiCall');

const {
  BASE_URL, SEARCH_URL, BROWSE_URL, ANIME_VIDEO_URL, BASE_JIKA_URL
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

  let $ = await homgot(`${ANIME_VIDEO_URL}${id}`, { scrapy: true })
  const scripts = $('script');
  const servers = [];

  Array.from({length: scripts.length} , (v , k) =>{
    const $script = $(scripts[k]);
    const contents = $script.html();
    if((contents || '').includes('var videos = {')) {
      servers.push(JSON.parse(contents.split('var videos = ')[1].split(';')[0]).SUB)
    }
  });

  return servers[0];

};

const animeByGenres = async(data) =>
    getInfo(await homgot(`${BROWSE_URL}genre%5B%5D=${data.genre}&order=${data.order}&page=${data.page}`,{ scrapy: true }));

const special = async(data) =>
    getInfo(await homgot(`${BROWSE_URL}type%5B%5D=${data.category}&order=${data.order}&page=${data.page}`, { scrapy: true }));

const animeByState = async(data) =>
    getInfo(await homgot(`${BROWSE_URL}type%5B%5D=tv&status%5B%5D=${data.state}&order=${data.order}&page=${data.page}`,{ scrapy: true }));

const search = async(query) =>
    getInfo(await homgot(`${SEARCH_URL}${query}`,{ scrapy: true }));

const getAnimeCharacters = async(title) =>{

  const res = await homgot(`${BASE_JIKA_URL}search/anime?q=${title}`, { parse: true })
  const matchAnime = res.results.filter(x => x.title === title);
  const malId = matchAnime[0].mal_id;

  if(typeof malId === 'undefined') return null;

  const data = await homgot(`${BASE_JIKA_URL}anime/${malId}/characters_staff`, { parse: true });
  let body = data.characters;

  if(typeof body === 'undefined') return null;

  const charactersId = body.map(doc => doc.mal_id)
  const charactersNames = body.map(doc => doc.name);
  const charactersImages = body.map(doc => doc.image_url);
  const charactersRoles = body.map(doc => doc.role);

  let characters = [];
  Array.from({length: charactersNames.length} , (v , k) =>{
    const id = charactersId[k];
    let name = charactersNames[k];
    let characterImg = charactersImages[k];
    let role = charactersRoles[k];
    characters.push({
      character:{
        id: id,
        name: name,
        image: characterImg,
        role: role
      }
    });
  });

  return Promise.all(characters);

};

const getAnimeVideoPromo = async(title) =>{

  const res = await homgot(`${BASE_JIKA_URL}search/anime?q=${title}`, { parse: true })
  const matchAnime = res.results.filter(x => x.title === title);
  const malId = matchAnime[0].mal_id;

  if(typeof malId === 'undefined') return null;

  const data = await homgot(`${BASE_JIKA_URL}anime/${malId}/videos`, { parse: true })
  const body = data.promo;

  body.map(doc =>({
    title: doc.title,
    previewImage: doc.image_url,
    videoURL: doc.video_url
  }));

  return Promise.all(body);

};

const getAnimeInfo = async(title) =>{

  let promises = [];
  let animeTitle = ''
  let animeId = ''
  let animeType = ''
  let animeIndex = ''

  let seriesTitle
  let position

  const titles = [
    { animeflv: 'Kaguya-sama wa Kokurasetai: Tensai-tachi no Renai Zunousen 2nd Season', myanimelist: 'Kaguya-sama wa Kokurasetai?: Tensai-tachi no Renai Zunousen', alternative: 'Kaguya-sama wa Kokurasetai'},
    { animeflv: 'Naruto Shippuden', myanimelist: 'Naruto: Shippuuden' },
    { animeflv: 'Rock Lee no Seishun Full-Power Ninden', myanimelist: 'Naruto SD: Rock Lee no Seishun Full-Power Ninden' },
    { animeflv: 'BAKI: dai reitaisai-hen', myanimelist: 'Baki 2nd Season' },
    { animeflv: 'Hitoribocchi no ○○ Seikatsu', myanimelist: 'Hitoribocchi no Marumaru Seikatsu' },
    { animeflv: 'Nekopara (TV)', myanimelist: 'Nekopara' },
    { animeflv: 'Black Clover (TV)', myanimelist: 'Black Clover' }
  ];

  for (let name in titles) {
    if (title === titles[name].animeflv || title === titles[name].myanimelist || title === titles[name].alternative) {
      seriesTitle = titles[name].animeflv
      position = name
    }
  }


  if (seriesTitle === undefined) {
    seriesTitle = title
  }

  await getAllAnimes().then(animes => {

    for (const i in animes) {
      if (animes[i].title.split('\t')[0] === seriesTitle.split('\t')[0] ||
          animes[i].title === `${seriesTitle} (TV)` ||
          animes[i].title.includes(seriesTitle.split('○')[0])
      ) {
        if (animes[i].title.includes('(TV)', 0)) { animeTitle = animes[i].title.split('\t')[0].replace(' (TV)', '') }
        else { animeTitle = animes[i].title.split('\t')[0] }
        animeId = animes[i].id
        animeIndex = animes[i].index
        animeType = animes[i].type.toLowerCase()

        if (position !== undefined) {
          seriesTitle = titles[position].myanimelist
        }

        break;

      }
    }
  });

  try{
    promises.push(await animeflvInfo(animeId, animeIndex).then(async extra => ({
      title: animeTitle || null,
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

  }catch(err){
    console.log(err)
  }

  return Promise.all(promises);

};

const getAllAnimes = async () =>{

  let data = await homgot(`${BASE_URL}/api/animes/list`, { parse: true })

  return data.map(item => ({
    index: item[0],
    animeId: item[3],
    title: item[1],
    id: item[2],
    type: item[4]
  }));

};

const downloadLinksByEpsId = async(id) =>{

  let $ = await homgot(`${ANIME_VIDEO_URL}${id}`,{ scrapy: true })
  let $table = $('table.RTbl')

  cheerioTableparser($);
  let tempServerNames = $table.parsetable(true , true , true)[0];
  let serverNames = tempServerNames.filter(x => x !== 'SERVIDOR');
  let urls = [];

  try{
    const table = $table.html();
    const data = await urlify(table).then(res => { return res; });
    const tempUrls = [];
    data.map(baseUrl => tempUrls.push(baseUrl.split('"')[0]));
    tempUrls.map(url => decodeURL(url).toString().split('?s=')[1]);

    Array.from({length: tempUrls.length} , (v , k) =>{
      urls.push({
        server: serverNames[k],
        url: tempUrls[k],
      });
    });

  }catch(err){
    console.log(err);
  }

  return Promise.all(urls);
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
