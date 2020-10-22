const {
  homgot
} = require('../api/apiCall');

const {
  BASE_URL, BASE_EPISODE_IMG_URL, BASE_JIKA_URL
} = require('../api/urls');

const getInfo = async (html, options) => {

  let promises = []

  html('div.Container ul.ListAnimes li article').each((index , element) =>{

    let $element = html(element);
    let id = $element.find('div.Description a.Button').attr('href').slice(1);
    let title = $element.find('a h3').text();
    let poster

    if (options !== undefined) {
      if (options.isWithoutBase) {
        poster = BASE_URL + $element.find('a div.Image figure img').attr('src');
      }
    } else {
      poster = $element.find('a div.Image figure img').attr('src');
    }

    let banner = poster.replace('covers' , 'banners').trim();
    let type = $element.find('div.Description p span.Type').text();
    let synopsis = $element.find('div.Description p').eq(1).text().trim();
    let rating = $element.find('div.Description p span.Vts').text();

    promises.push(animeInfo(id).then(async extra => ({
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

const animeInfo = async(id, index) =>{

  try {

    let $ = await homgot(`${BASE_URL}/${id}`, { scrapy: true })

    const scripts = $('script');
    const anime_info_ids = [];
    const anime_eps_data = [];
    const animeExtraInfo = [];
    const genres = [];
    let listByEps;

    const animeTitle = $('body div.Wrapper div.Body div div.Ficha.fchlt div.Container h2.Title').text();
    const poster = `${BASE_URL}` + $('body div div div div div aside div.AnimeCover div.Image figure img').attr('src')
    const banner = poster.replace('covers', 'banners').trim();
    const synopsis = $('body div div div div div main section div.Description p').text().trim();
    const rating = $('body div div div.Ficha.fchlt div.Container div.vtshr div.Votes span#votes_prmd').text();
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

    $('main.Main section.WdgtCn nav.Nvgnrs a').each((index, element) =>
        genres.push($(element).attr('href').split('=')[1] || null)
    );

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

    const AnimeThumbnailsId = index;
    const animeId = id.split('anime/')[1];

    let nextEpisodeDate
    if (JSON.parse(JSON.stringify(anime_info_ids[0])).split('\"').length === 9) {
      nextEpisodeDate = JSON.parse(JSON.stringify(anime_info_ids[0])).split("\"")[7]
    } else {
      nextEpisodeDate = null
    }

    const amimeTempList = [];
    for (const [key] of Object.entries(anime_eps_data)) {
      let episode = anime_eps_data[key].map(x => x[0]);
      let episodeId = anime_eps_data[key].map(x => x[1]);
      amimeTempList.push(episode, episodeId);
    }
    const listEps = [{nextEpisodeDate: nextEpisodeDate}];
    Array.from({length: amimeTempList[1].length}, (v, k) => {
      let data = amimeTempList.map(x => x[k]);
      let episode = data[0];
      let id = data[1];
      let imagePreview = `${BASE_EPISODE_IMG_URL}${AnimeThumbnailsId}/${episode}/th_3.jpg`
      let link = `${id}/${animeId}-${episode}`

      listEps.push({
        episode: episode,
        id: link,
        imagePreview: imagePreview
      })
    })

    listByEps = listEps

    return {listByEps , genres , animeExtraInfo};

  } catch (e) {
    console.log(e)
  }

};

const animeExtraInfo = async(title) =>{

  const matchAnime = await getMALid(title)

  try {

    if(matchAnime !== null) {
      const data = await homgot(`${BASE_JIKA_URL}anime/${matchAnime.mal_id}`, { parse: true })
      return Array(data).map(doc => ({
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
          })
      );
    }
  } catch (err) {
    console.log(err)
  }

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

const imageUrlToBase64 = async (url) => {
  let img = await homgot(url);
  return img.rawBody.toString('base64');
};

const getMALid = async(title) =>{

  const res = await homgot(`${BASE_JIKA_URL}search/anime?q=${title}`,{ parse: true })
  const matchAnime = res.results.find(x => x.title === title);

  if(typeof matchAnime === 'undefined') {
    return null;
  } else {
    return matchAnime;
  }

};

const urlify = async(text) =>{
  const urls = [];
  text.replace(/(https?:\/\/[^\s]+)/g , (url) =>{
    urls.push(url)
  });
  return urls;
};

module.exports = {
  getInfo,
  animeInfo,
  animeExtraInfo,
  getAllAnimes,
  imageUrlToBase64,
  getMALid,
  urlify
}
