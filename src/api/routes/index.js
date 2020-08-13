const express = require('express');
const router = express.Router();
const api = require('../api');

router.get('/LatestAnimeAdded' , (req , res) =>{

  api.latestAnimeAdded()
    .then(animes =>{
        if (animes.length > 0) {
            res.status(200).json({
                animes
            });
        } else (
            res.status(500).json({ message: 'Animeflv error'})
        )
    }).catch((err) =>{
      console.error(err);
    });

});

router.get('/LatestEpisodesAdded' , (req , res) =>{

  api.latestEpisodesAdded()
    .then(episodes =>{
        if (episodes.length > 0) {
            res.status(200).json({
                episodes
            });
        } else (
            res.status(500).json({ message: 'Animeflv error'})
        )
    }).catch((err) =>{
      console.error(err);
    });

});

router.get('/GetAnimeServers/:id([^/]+/[^/]+)' , (req , res) =>{

  let id = req.params.id;

  api.getAnimeServers(id)
    .then(servers =>{
        if (servers.length > 0) {
            res.status(200).json({
                servers
            });
        } else (
            res.status(500).json({ message: 'Animeflv error'})
        )
    }).catch((err) =>{
      console.error(err);
    });

});

router.get('/Genres/:genre/:order/:page' , (req , res) =>{

  let data = { genre: req.params.genre, order: req.params.order, page: req.params.page  };

  api.animeByGenres(data)
    .then(animes =>{
        if (animes.length > 0) {
            res.status(200).json({
                animes
            });
        } else (
            res.status(500).json({ message: 'Animeflv error'})
        )
    }).catch((err) =>{
      console.error(err);
    });
});

router.get('/Movies/:order/:page' , (req , res) =>{

  let data = { category: 'movie', order: req.params.order, page: req.params.page  };

  api.special(data)
    .then(movies =>{
        if (movies.length > 0) {
            res.status(200).json({
                movies
            });
        } else (
            res.status(500).json({ message: 'Animeflv error'})
        )
    }).catch((err) =>{
      console.error(err);
    });
});

router.get('/Special/:order/:page' , (req , res) =>{

  let data = { category: 'special', order: req.params.order, page: req.params.page  };

  api.special(data)
    .then(special =>{
        if (special.length > 0) {
            res.status(200).json({
                special
            });
        } else (
            res.status(500).json({ message: 'Animeflv error'})
        )
    }).catch((err) =>{
      console.error(err);
    });

});

router.get('/Ova/:order/:page' , (req , res) =>{

  let data = { category: 'ova', order: req.params.order, page: req.params.page  };

  api.special(data)
    .then(ova =>{
        if (ova.length > 0) {
            res.status(200).json({
                ova
            });
        } else (
            res.status(500).json({ message: 'Animeflv error'})
        )
    }).catch((err) =>{
      console.error(err);
    });

});

router.get('/TV/:order/:page' , (req , res) =>{

  let data = { category: 'tv', order: req.params.order, page: req.params.page  };

  api.special(data)
    .then(tv =>{
        if (tv.length > 0) {
            res.status(200).json({
                tv
            });
        } else (
            res.status(500).json({ message: 'Animeflv error'})
        )
    }).catch((err) =>{
      console.error(err);
    });
});

router.get('/AnimeByState/:state/:order/:page' , (req , res) =>{

  let data = { state: req.params.state, order: req.params.order, page: req.params.page  };

  api.animeByState(data)
    .then(animes =>{
        if (animes.length > 0) {
            res.status(200).json({
                animes
            });
        } else (
            res.status(500).json({ message: 'Animeflv error'})
        )
    }).catch((err) =>{
      console.error(err);
    });

});

router.get('/Search/:query' , (req , res) =>{

  let query = req.params.query;

  api.search(query)
    .then(search =>{
        if (search.length > 0) {
            res.status(200).json({
                search
            });
        } else (
            res.status(500).json({ message: 'Animeflv error'})
        )
    }).catch((err) =>{
      console.error(err);
    });

});

router.get('/AnimeCharacters/:title' , (req , res) =>{

  let title = req.params.title.toString();

  api.getAnimeCharacters(title)
    .then(characters =>{
        if (characters.length > 0) {
            res.status(200).json({
                characters
            });
        } else (
            res.status(500).json({ message: 'Animeflv error'})
        )
    }).catch((err) =>{
      console.error(err);
    })

});

router.get('/AnimeTrailers/:title' , (req , res) =>{

  let title = req.params.title.toString();

  api.getAnimeVideoPromo(title)
    .then(trailers =>{
        if (trailers.length > 0) {
            res.status(200).json({
                trailers
            });
        } else (
            res.status(500).json({ message: 'Animeflv error'})
        )
    }).catch((err) =>{
      console.error(err);
    });

});


router.get('/GetAnimeInfo/:title' , (req , res) =>{

  let title = req.params.title;

  api.getAnimeInfo(title)
    .then(info =>{
        if (info.length > 0) {
            res.status(200).json({
                info
            });
        } else (
            res.status(500).json({ message: 'Animeflv error'})
        )
    }).catch((err) =>{
      console.log(err);
    });
});

router.get('/allAnimes' , (req , res) =>{

    api.getAllAnimes()
        .then(animes =>{
            if (animes.length > 0) {
                res.status(200).json({
                    animes
                });
            } else (
                res.status(500).json({ message: 'Animeflv error'})
            )
        }).catch((err) =>{
        console.log(err);
    });

});

router.get('/DownloadLinksByEpsId/:epsId([^/]+/[^/]+)' , (req , res) =>{

  let epsId = req.params.epsId;

  api.downloadLinksByEpsId(epsId)
    .then(downloads =>{
        if (downloads.length > 0) {
            res.status(200).json({
                downloads
            });
        } else (
            res.status(500).json({ message: 'Animeflv error'})
        )
    }).catch((err) =>{
      console.log(err);
    });

});

module.exports = router;
