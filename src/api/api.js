const cheerio = require('cheerio');
const cheerioTableparser = require('cheerio-tableparser');
const cloudscraper = require('cloudscraper');
const html = require('got');
const decodeURL = require('urldecode');
const {urlify , decodeZippyURL , imageUrlToBase64} = require('../utils/index');

const {
  BASE_URL         , SEARCH_URL             , BROWSE_URL ,
  ANIME_VIDEO_URL  , BASE_EPISODE_IMG_URL   ,
  BASE_JIKA_URL
} = require('./urls');

const animeExtraInfo = async(title) =>{

  const res = await html(`${BASE_JIKA_URL}search/anime?q=${title}`).json();
  const matchAnime = res.results.filter(x => x.title === title);
  const malId = matchAnime[0].mal_id;

  if(typeof matchAnime[0].mal_id === 'undefined') return null;

  const data = await html(`${BASE_JIKA_URL}anime/${malId}`).json();
  const body = Array(data);
  const promises = [];

  body.map(doc =>{
    promises.push({
      malid: doc.mal_id,
      titleJapanese: doc.title_japanese,
      source: doc.source,
      totalEpisodes: doc.episodes,
      status: doc.status,
      aired:{
        from: doc.aired.from,
        to: doc.aired.to,
        string: doc.aired.string
      },
      duration: doc.duration,
      rank: doc.rank,
      popularity: doc.popularity,
      members: doc.members,
      favorites: doc.favorites,
      premiered: doc.premiered,
      broadcast: doc.broadcast,
      producers:{
        names: doc.producers.map(x => x.name)
      },
      licensors:{
        names: doc.licensors.map(x => x.name)
      },
      studios:{
        names: doc.studios.map(x => x.name)
      },
      openingThemes: doc.opening_themes,
      endingThemes: doc.ending_themes
    });
  });
  return Promise.all(promises);
};

const downloadLinksByEpsId = async(id) =>{

  let res
  let $

  try {
    res = await html(`${ANIME_VIDEO_URL}${id}`);
    $ = await cheerio.load(res.body);
  } catch (error) {
    res = await cloudscraper.get(`${ANIME_VIDEO_URL}${id}`);
    $ = await cheerio.load(res)
  }

  cheerioTableparser($);
  let tempServerNames = $('table.RTbl').parsetable(true , true , true)[0];
  let serverNames = tempServerNames.filter(x => x !== 'SERVIDOR');
  let urls = [];

  try{
    const table = $('table.RTbl').html();
    const data = await urlify(table).then(res => { return res; });
    const tempUrls = [];
    data.map(baseUrl =>{
      let url = baseUrl.split('"')[0];
      tempUrls.push(url)
    });

    const urlDecoded = [];
    tempUrls.map(url =>{
      let urlFixed = decodeURL(url).toString().split('?s=')[1]
      urlDecoded.push(urlFixed)
    });

    Array.from({length: tempUrls.length} , (v , k) =>{
      urls.push({
        server: serverNames[k],
        url: urlDecoded[k],
      });
    });

    const zippyshareURL = urls.filter(doc => doc.server == 'Zippyshare')[0].url || null;
    const zippyMP4 = await decodeZippyURL(zippyshareURL);

    for(var key in urls){
      if(urls.hasOwnProperty(key)){
        if(urls[key].server == 'Zippyshare'){
          urls[key].url = zippyMP4
        }
      }
    }

  }catch(err){
    console.log(err);
  }

  return Promise.all(urls);
};

const getAnimeInfo = async(id , title) =>{

  let promises = [];

  try{
    promises.push(await animeEpisodesHandler(id).then(async extra => ({
      id: id || null,
      title: extra.animeExtraInfo[0].title || null,
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

const getAnimeVideoPromo = async(title) =>{

  const res = await html(`${BASE_JIKA_URL}search/anime?q=${title}`).json();
  const matchAnime = res.results.filter(x => x.title === title);
  const malId = matchAnime[0].mal_id;

  if(typeof matchAnime[0].mal_id === 'undefined') return null;

  const data = await html(`${BASE_JIKA_URL}anime/${malId}/videos`).json();
  const body = data.promo;
  const promises = [];

  body.map(doc =>{
    promises.push({
      title: doc.title,
      previewImage: doc.image_url,
      videoURL: doc.video_url
    });
  });

  return Promise.all(promises);
};

const getAnimeCharacters = async(title) =>{

  const res = await html(`${BASE_JIKA_URL}search/anime?q=${title}`).json();
  const matchAnime = res.results.filter(x => x.title === title);
  const malId = matchAnime[0].mal_id;

  if(typeof matchAnime[0].mal_id === 'undefined') return null;

  const data = await html(`${BASE_JIKA_URL}anime/${malId}/characters_staff`).json();
  let body = data.characters;

  if(typeof body === 'undefined') return null;

  const charactersId = body.map(doc =>{
    return doc.mal_id
  })
  const charactersNames = body.map(doc => {
    return doc.name;
  });
  const charactersImages = body.map(doc =>{
    return doc.image_url
  });
  const charactersRoles = body.map(doc =>{
    return doc.role
  });

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

const search = async(query) =>{

  let res
  let $
  let promises = []

  try {
    res = await html(`${SEARCH_URL}${query}`);
    $ = await cheerio.load(res.body);
  } catch (error) {
    res = await cloudscraper.get(`${SEARCH_URL}${query}`);
    $ = await cheerio.load(res)
  }

  $('div.Container ul.ListAnimes li article').each((index , element) =>{

    const $element = $(element);
    const id = $element.find('div.Description a.Button').attr('href').slice(1);
    const title = $element.find('a h3').text();
    let poster = $element.find('a div.Image figure img').attr('src') || $element.find('a div.Image figure img').attr('data-cfsrc');
    const banner = poster.replace('covers' , 'banners').trim();
    const type = $element.find('div.Description p span.Type').text();
    const synopsis = $element.find('div.Description p').eq(1).text().trim();
    const rating = $element.find('div.Description p span.Vts').text();

    promises.push(animeEpisodesHandler(id).then(async extra => ({
      id: id || null,
      title: title || null,
      poster: await imageUrlToBase64(poster) || null,
      banner: banner || null,
      synopsis: synopsis || null,
      debut: extra.animeExtraInfo[0].debut || null,
      type: type || null,
      rating: rating || null,
      genres: extra.genres || null,
      episodes: extra.listByEps || null,
    })))

  })

  return Promise.all(promises);

};

const animeByState = async(state, order, page ) => {

  let res
  let $
  let promises = []

  try {
    res = await html(`${BROWSE_URL}type%5B%5D=tv&status%5B%5D=${state}&order=${order}&page=${page}`);
    $ = await cheerio.load(res.body);
  } catch (error) {
    res = await cloudscraper.get(`${BROWSE_URL}type%5B%5D=tv&status%5B%5D=${state}&order=${order}&page=${page}`);
    $ = await cheerio.load(res)
  }

  $('div.Container ul.ListAnimes li article').each((index , element) =>{

    const $element = $(element);
    const id = $element.find('div.Description a.Button').attr('href').slice(1);
    const title = $element.find('a h3').text();
    const poster = $element.find('a div.Image figure img').attr('src');
    const banner = poster.replace('covers' , 'banners').trim();
    const type = $element.find('div.Description p span.Type').text();
    const synopsis = $element.find('div.Description p').eq(1).text().trim();
    const rating = $element.find('div.Description p span.Vts').text();

    promises.push(animeEpisodesHandler(id).then(async extra => ({
      id: id || null,
      title: title || null,
      poster: await imageUrlToBase64(poster) || null,
      banner: banner || null,
      synopsis: synopsis || null,
      debut: extra.animeExtraInfo[0].debut || null,
      type: type || null,
      rating: rating || null,
      genres: extra.genres || null,
      episodes: extra.listByEps || null
    })))

  })

  return Promise.all(promises);

};

const special = async(order, page, type) => {

  let res
  let $
  let promises = []

  try {
    res = await html(`${BROWSE_URL}type%5B%5D=${type.category}&order=${order}&page=${page}`);
    $ = await cheerio.load(res.body);
  } catch (error) {
    res = await cloudscraper.get(`${BROWSE_URL}type%5B%5D=${type.category}&order=${order}&page=${page}`);
    $ = await cheerio.load(res)
  }

  $('div.Container ul.ListAnimes li article').each((index , element) =>{

    const $element = $(element);
    const id = $element.find('div.Description a.Button').attr('href').slice(1);
    const title = $element.find('a h3').text();
    const poster = $element.find('a div.Image figure img').attr('src');
    const banner = poster.replace('covers' , 'banners').trim();
    const type = $element.find('div.Description p span.Type').text();
    const synopsis = $element.find('div.Description p').eq(1).text().trim();
    const rating = $element.find('div.Description p span.Vts').text();

    promises.push(animeEpisodesHandler(id).then(async extra => ({
      id: id || null,
      title: title || null,
      poster: await imageUrlToBase64(poster) || null,
      banner: banner || null,
      synopsis: synopsis || null,
      debut: extra.animeExtraInfo[0].debut || null,
      type: type || null,
      rating: rating || null,
      genres: extra.genres || null,
      episodes: extra.listByEps || null
    })))

  })

  return Promise.all(promises);

};

const animeByGenres = async(genre, order, page) => {

  let res
  let $
  let promises = []

  try {
    res = await html(`${BROWSE_URL}genre%5B%5D=${genre}&order=${order}&page=${page}`);
    $ = await cheerio.load(res.body);
  } catch (error) {
    res = await cloudscraper.get(`${BROWSE_URL}genre%5B%5D=${genre}&order=${order}&page=${page}`);
    $ = await cheerio.load(res)
  }

  $('div.Container ul.ListAnimes li article').each((index , element) =>{
    const $element = $(element);
    const id = $element.find('div.Description a.Button').attr('href').slice(1);
    const title = $element.find('a h3').text();
    const poster = $element.find('a div.Image figure img').attr('src');
    const banner = poster.replace('covers' , 'banners').trim();
    const type = $element.find('div.Description p span.Type').text();
    const synopsis = $element.find('div.Description p').eq(1).text().trim();
    const rating = $element.find('div.Description p span.Vts').text();

    promises.push(animeEpisodesHandler(id).then(async extra => ({
      id: id || null,
      title: title || null,
      poster: await imageUrlToBase64(poster) || null,
      banner: banner || null,
      synopsis: synopsis || null,
      debut: extra.animeExtraInfo[0].debut || null,
      type: type || null,
      rating: rating || null,
      genres: extra.genres || null,
      episodes: extra.listByEps || null
    })))

  })

  return Promise.all(promises);

};

const latestEpisodesAdded = async() =>{

  let res
  let $
  let promises = []

  try {
    res = await html(`${BASE_URL}`);
    $ = await cheerio.load(res.body);
  } catch (error) {
    res = await cloudscraper.get(`${BASE_URL}`);
    $ = await cheerio.load(res)
  }

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

const latestAnimeAdded = async() =>{

  let res
  let $
  let promises = []

  try {
    res = await html(`${BASE_URL}`);
    $ = await cheerio.load(res.body);
  } catch (error) {
    res = await cloudscraper.get(`${BASE_URL}`);
    $ = await cheerio.load(res)
  }

  $('div.Container ul.ListAnimes li article').each((index , element) =>{

    const $element = $(element);
    const id = $element.find('div.Description a.Button').attr('href').slice(1);
    const title = $element.find('a h3').text();
    const poster = BASE_URL + $element.find('a div.Image figure img').attr('src');
    const banner = poster.replace('covers' , 'banners').trim();
    const type = $element.find('div.Description p span.Type').text();
    const synopsis = $element.find('div.Description p').text().trim();
    const rating = $element.find('div.Description p span.Vts').text();

    promises.push(animeEpisodesHandler(id).then(async extra => ({
      id: id || null,
      title: title || null,
      poster: await imageUrlToBase64(poster) || null,
      banner: banner || null,
      synopsis: synopsis || null,
      debut: extra.animeExtraInfo[0].debut.toString() || null,
      type: type || null,
      rating: rating || null,
      genres: extra.genres || null,
      episodes: extra.listByEps || null
    })))

  })

  return await Promise.all(promises);

};

const animeEpisodesHandler = async(id) =>{

  try{

    let res
    let $

    try {
      res = await html(`${BASE_URL}/${id}`);
      $ = await cheerio.load(res.body);
    } catch (error) {
      res = await cloudscraper.get(`${BASE_URL}/${id}`);
      $ = await cheerio.load(res)
    }

    const scripts = $('script');
    const anime_info_ids = [];
    const anime_eps_data = [];
    const animeExtraInfo = [];
    const genres = [];
    let listByEps;

    let animeTitle = $('body div.Wrapper div.Body div div.Ficha.fchlt div.Container h2.Title').text();
    let poster = `${BASE_URL}` + $('body div div div div div aside div.AnimeCover div.Image figure img').attr('src')
    const banner = poster.replace('covers' , 'banners').trim();
    let synopsis = $('body div div div div div main section div.Description p').text().trim();
    let rating = $('body div div div.Ficha.fchlt div.Container div.vtshr div.Votes span#votes_prmd').text();
    const debut = $('body div.Wrapper div.Body div div.Container div.BX.Row.BFluid.Sp20 aside.SidebarA.BFixed p.AnmStts').text();
    const type = $('body div.Wrapper div.Body div div.Ficha.fchlt div.Container span.Type').text()

    animeExtraInfo.push({
      title: animeTitle,
      poster: poster,
      banner: banner,
      synopsis: synopsis,
      rating: rating,
      debut: debut,
      type: type,
    })

    $('main.Main section.WdgtCn nav.Nvgnrs a').each((index , element) =>{
      const $element = $(element);
      const genre = $element.attr('href').split('=')[1] || null;
      genres.push(genre);
    });

    Array.from({length: scripts.length} , (v , k) =>{
      const $script = $(scripts[k]);
      const contents = $script.html();
      if((contents || '').includes('var anime_info = [')) {
        let anime_info = contents.split('var anime_info = ')[1].split(';')[0];
        let dat_anime_info = JSON.parse(JSON.stringify(anime_info));//JSON.parse(anime_info);
        anime_info_ids.push(dat_anime_info);
      }
      if((contents || '').includes('var episodes = [')) {
        let episodes = contents.split('var episodes = ')[1].split(';')[0];
        let eps_data = JSON.parse(episodes)
        anime_eps_data.push(eps_data);
      }
    });
    const AnimeThumbnailsId = anime_info_ids[0].split(',')[0].split('"')[1];
    const animeId = id.split('anime/')[1];

    let nextEpisodeDate

    if (Object.keys(JSON.parse(JSON.stringify(anime_info_ids[0])).length == 4)) {
      nextEpisodeDate = Object.values(JSON.parse(JSON.stringify(anime_info_ids[0])))[3]
    } else {
      nextEpisodeDate = null
    }

    const amimeTempList = [];
    for(const [key , value] of Object.entries(anime_eps_data)){
      let episode = anime_eps_data[key].map(x => x[0]);
      let episodeId = anime_eps_data[key].map(x => x[1]);
      amimeTempList.push(episode , episodeId);
    }
    const animeListEps = [{nextEpisodeDate: nextEpisodeDate}];
    Array.from({length: amimeTempList[1].length} , (v , k) =>{
      let data = amimeTempList.map(x => x[k]);
      let episode = data[0];
      let id = data[1];
      let imagePreview = `${BASE_EPISODE_IMG_URL}${AnimeThumbnailsId}/${episode}/th_3.jpg`
      let link = `${id}/${animeId}-${episode}`
      // @ts-ignore
      animeListEps.push({
        episode: episode,
        id: link,
        imagePreview: imagePreview
      })
    })

    listByEps = animeListEps;

    return {listByEps , genres , animeExtraInfo};
  }catch(err){
    console.error(err)
  }
};

const getAnimeServers = async(id) =>{

  let res
  let $

  try {
    res = await html(`${ANIME_VIDEO_URL}${id}`);
    $ = await cheerio.load(res.body);
  } catch (error) {
    res = await cloudscraper.get(`${ANIME_VIDEO_URL}${id}`);
    $ = await cheerio.load(res)
  }

  const scripts = $('script');
  const servers = [];

  Array.from({length: scripts.length} , (v , k) =>{
    const $script = $(scripts[k]);
    const contents = $script.html();
    if((contents || '').includes('var videos = {')) {
      let videos = contents.split('var videos = ')[1].split(';')[0];
      let data = JSON.parse(videos)
      let serverList = data.SUB;
      servers.push(serverList)
    }
  });

  return servers[0];

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
  downloadLinksByEpsId
};
