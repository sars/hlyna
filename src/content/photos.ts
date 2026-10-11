// Documentary photos from Wikimedia Commons (public/images/doc, credits in CREDITS.md there).
// CC BY-SA needs a visible credit: render with <DocPhoto>, which prints author and license.
export type DocPhoto = { src: string; width: number; height: number; alt: string; author: string; license: string; href: string; source?: string }

export const docPhotos = {
  wheelHands: { src: '/images/doc/wheel-hands.jpg', width: 960, height: 640, alt: 'Руки гончаря формують виріб на гончарному колі', author: 'Віталій Попков', license: 'CC BY-SA 4.0', href: 'https://commons.wikimedia.org/wiki/File:%D0%A0%D1%83%D0%BA%D0%B8_%D0%B3%D0%BE%D0%BD%D1%87%D0%B0%D1%80%D0%B0.jpg' },
  wheelCloseup: { src: '/images/doc/wheel-closeup.jpg', width: 960, height: 640, alt: 'Глина на гончарному колі крупним планом', author: 'Віталій Попков', license: 'CC BY-SA 4.0', href: 'https://commons.wikimedia.org/wiki/File:%D0%A1%D1%82%D0%B2%D0%BE%D1%80%D0%B5%D0%BD%D0%BD%D1%8F.jpg' },
  barCups: { src: '/images/doc/bar-cups.jpg', width: 960, height: 1280, alt: 'Розписні горнята й тарілки барської кераміки на столі', author: 'Качуровська', license: 'CC BY-SA 4.0', href: 'https://commons.wikimedia.org/wiki/File:%D0%92_%D0%B5%D1%82%D0%BD%D0%BE%D1%81%D0%B2%D1%96%D1%82%D0%BB%D0%B8%D1%86%D1%96_%D1%80%D0%BE%D0%B4%D0%B8%D0%BD%D0%B8_%D0%91%D1%96%D0%BD%D1%8C%D0%BA%D0%B2%D1%81%D1%8C%D0%BA%D0%B8%D1%85,_%D0%93%D0%B0%D1%80%D0%BC%D0%B0%D0%BA%D0%B8,_20240912_12.jpg' },
  festiveWare: { src: '/images/doc/festive-ware.jpg', width: 960, height: 720, alt: 'Святковий розписний посуд бубнівської кераміки', author: 'Андрій Стебелєв', license: 'CC0', href: 'https://commons.wikimedia.org/wiki/File:Bubnivka_Ceramics_2_Ukraine.JPG' },
  schoolStudio: { src: '/images/doc/school-studio.jpg', width: 960, height: 640, alt: 'Світла гончарна майстерня з довгими столами для занять', author: 'Саковець', license: 'CC BY-SA 4.0', href: 'https://commons.wikimedia.org/wiki/File:%D0%93%D0%BE%D0%BD%D1%87%D0%B0%D1%80%D0%BD%D1%8F_%D0%91%D0%A2%D0%9B_%22%D0%A0%D0%B0%D0%B4%D0%BE%D0%B2%D0%B5%D0%BB%D1%8C%22.jpg' },
  handbuilding: { src: '/images/doc/handbuilding.jpg', width: 960, height: 1280, alt: 'Майстриня ліпить невеликі фігурки з глини', author: 'Качуровська', license: 'CC BY-SA 4.0', href: 'https://commons.wikimedia.org/wiki/File:%D0%93%D0%BE%D0%BD%D1%87%D0%B0%D1%80%D1%96_%D0%BF%D1%96%D0%B4_%D1%87%D0%B0%D1%81_%D1%81%D1%82%D0%B2%D0%BE%D1%80%D0%B5%D0%BD%D0%BD%D1%8F_%D0%B2%D0%B8%D1%80%D0%BE%D0%B1%D1%96%D0%B2_20240912_08.jpg' },
  paintingBowl: { src: '/images/doc/painting-bowl.jpg', width: 960, height: 1280, alt: 'Розпис керамічної миски пензлем', author: 'Качуровська', license: 'CC BY-SA 4.0', href: 'https://commons.wikimedia.org/wiki/File:%D0%93%D0%BE%D0%BD%D1%87%D0%B0%D1%80%D1%96_%D0%BF%D1%96%D0%B4_%D1%87%D0%B0%D1%81_%D1%81%D1%82%D0%B2%D0%BE%D1%80%D0%B5%D0%BD%D0%BD%D1%8F_%D0%B2%D0%B8%D1%80%D0%BE%D0%B1%D1%96%D0%B2_20240912_12.jpg' },
  potterOutdoors: { src: '/images/doc/potter-outdoors.jpg', width: 934, height: 1400, alt: 'Гончар працює на ножному колі просто неба', author: 'Yurii-mr', license: 'CC BY-SA 4.0', href: 'https://commons.wikimedia.org/wiki/File:Potter_02.jpg' },
  paintingGroup: { src: '/images/doc/painting-group.jpg', width: 960, height: 720, alt: 'Учасниці майстер-класу розписують кераміку за спільним столом', author: 'Качуровська', license: 'CC BY-SA 4.0', href: 'https://commons.wikimedia.org/wiki/File:%D0%93%D0%BE%D0%BD%D1%87%D0%B0%D1%80%D1%96_%D0%BF%D1%96%D0%B4_%D1%87%D0%B0%D1%81_%D1%81%D1%82%D0%B2%D0%BE%D1%80%D0%B5%D0%BD%D0%BD%D1%8F_%D0%B2%D0%B8%D1%80%D0%BE%D0%B1%D1%96%D0%B2_20240912_03.jpg' },
  workshopTable: { src: '/images/doc/workshop-table.jpg', width: 960, height: 720, alt: 'Великий стіл майстерні з розписаними виробами і людьми за роботою', author: 'Качуровська', license: 'CC BY-SA 4.0', href: 'https://commons.wikimedia.org/wiki/File:%D0%93%D0%BE%D0%BD%D1%87%D0%B0%D1%80%D1%96_%D0%BF%D1%96%D0%B4_%D1%87%D0%B0%D1%81_%D1%81%D1%82%D0%B2%D0%BE%D1%80%D0%B5%D0%BD%D0%BD%D1%8F_%D0%B2%D0%B8%D1%80%D0%BE%D0%B1%D1%96%D0%B2_20240912_05.jpg' },
  // CC0 photos from Unsplash, mirrored on Wikimedia Commons (author and file page below); used where no documentary
  // photo fits. Credit is not required for CC0 but we show it.
  tealMug: { src: '/images/stock/teal-mug.jpg', width: 960, height: 653, alt: 'Керамічна чашка ручної роботи з бірюзовою поливою', author: 'Alejandra Parejo', license: 'CC0', href: 'https://commons.wikimedia.org/wiki/File:Teal_mug_over_gingham_cloth_(Unsplash).jpg', source: 'Unsplash' },
  wheelTop: { src: '/images/stock/wheel-top.jpg', width: 960, height: 640, alt: 'Руки формують миску на гончарному колі, вигляд згори', author: 'Jared Sluyter', license: 'CC0', href: 'https://commons.wikimedia.org/wiki/File:Making_pottery_(Unsplash).jpg', source: 'Unsplash' },
  restaurantTable: { src: '/images/stock/restaurant-table.jpg', width: 960, height: 640, alt: 'Керамічні тарілки і піала на сервірованому столі', author: 'pepe nero', license: 'CC0', href: 'https://commons.wikimedia.org/wiki/File:Dinnerware_setup_(Unsplash).jpg', source: 'Unsplash' },
  glazedBottles: { src: '/images/stock/glazed-bottles.jpg', width: 960, height: 640, alt: 'Керамічні пляшки й вази з матовою поливою', author: 'Jessica Ruscello', license: 'CC0', href: 'https://commons.wikimedia.org/wiki/File:Large_ceramic_bottles_(Unsplash).jpg', source: 'Unsplash' },
  terracotta: { src: '/images/stock/terracotta.jpg', width: 960, height: 640, alt: 'Теракотові глечики, горщики й миски на полицях майстерні', author: 'Igor Ovsyannykov', license: 'CC0', href: 'https://commons.wikimedia.org/wiki/File:Handmade_Terracotta_Ceramics_(Unsplash).jpg', source: 'Unsplash' },
  handsClay: { src: '/images/stock/hands-clay.jpg', width: 960, height: 640, alt: 'Руки м’ять шматок глини на дерев’яному столі', author: 'Alex Jones', license: 'CC0', href: 'https://commons.wikimedia.org/wiki/File:Pottery_and_craft_(Unsplash).jpg', source: 'Unsplash' },
  wheelBw: { src: '/images/stock/wheel-bw.jpg', width: 960, height: 640, alt: 'Руки гончаря центрують глину на колі, чорно-біле фото', author: 'Quino Al', license: 'CC0', href: 'https://commons.wikimedia.org/wiki/File:Black_and_white_pottery_(Unsplash).jpg', source: 'Unsplash' },
} satisfies Record<string, DocPhoto>

export type DocPhotoKey = keyof typeof docPhotos

// Photos of the site's own chrome (home page, headers of lists): the owner's archive, no credit line.
// docs/design/photo-plan.md says which frame goes where. Until the frames are exported (step 4 of docs/design/SYSTEM.md §9)
// every slot points at a file that already exists in public/images, so pages and the styleguide render now.
export type SitePhoto = { src: string; width: number; height: number; alt: string }

const slot = ({ src, width, height, alt }: DocPhoto): SitePhoto => ({ src, width, height, alt })

export const sitePhotos = {
  // Wordmark window (8:3 strip, decorative: the text on top carries the meaning). Plan: frame 331.
  wordmarkDesktop: { ...slot(docPhotos.wheelHands), alt: '' },
  wordmarkMobile: { ...slot(docPhotos.wheelHands), alt: '' },
  // Home «Що ви шукаєте?», cards 01–06 (1:1). Plan: 01 stock, 02 frame 542, 03 82, 04 346, 05 320, 06 408.
  cardVenues: slot(docPhotos.restaurantTable),
  cardLogo: slot(docPhotos.tealMug),
  cardGifts: slot(docPhotos.festiveWare),
  cardPair: slot(docPhotos.wheelTop),
  cardClass: slot(docPhotos.potterOutdoors),
  cardCertificate: slot(docPhotos.handbuilding),
  // Home market block (4:5, plan: frame 505) and «Для студій» (3:4, plan: frame 57).
  market: slot(docPhotos.glazedBottles),
  forStudios: slot(docPhotos.schoolStudio),
} satisfies Record<string, SitePhoto>

export type SitePhotoKey = keyof typeof sitePhotos
