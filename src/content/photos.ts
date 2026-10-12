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


// Photos of the site's own chrome (home page, headers of lists): the owner's archive, no credit line.
// docs/design/photo-plan.md says which frame goes where; files are cut from the 3000px masters into public/images/site/
// (JPEG, sRGB, no EXIF). The frame number of each slot is in the comment (index: docs/design/photo-index.tsv).
export type SitePhoto = { src: string; width: number; height: number; alt: string }

export const sitePhotos = {
  // Wordmark window (8:3 strip, decorative: the text on top carries the meaning). Frame 331; the phone file is the same crop at 1200 px.
  wordmarkDesktop: { src: '/images/site/home-wordmark-1.jpg', width: 2400, height: 900, alt: '' },
  wordmarkMobile: { src: '/images/site/home-wordmark-mobile-1.jpg', width: 1200, height: 450, alt: '' },
  // Home «Що ви шукаєте?», cards 01–06 (1:1). 01 is an external Unsplash photo (Big Dodzy; no archive frame of a dish in a restaurant), see public/images/site/CREDITS.md.
  cardVenues: { src: '/images/site/home-path-01-1.jpg', width: 1200, height: 1200, alt: 'Страва в керамічній мисці ручної роботи, яку тримають у руках' },
  cardLogo: { src: '/images/site/home-path-02-1.jpg', width: 1200, height: 1200, alt: 'Відтиск штампа-квітки на сирій тарілці з рожевим краєм' }, // 542
  cardGifts: { src: '/images/site/home-path-03-1.jpg', width: 1200, height: 1200, alt: 'Чашка ручної роботи з червоними сердечками на дерев’яній полиці' }, // 82
  cardPair: { src: '/images/site/home-path-04-1.jpg', width: 1200, height: 1200, alt: 'Дві пари рук тримають свіжу миску на гончарному колі, вигляд згори' }, // 346
  cardClass: { src: '/images/site/home-path-05-1.jpg', width: 1200, height: 1200, alt: 'Руки центрують глину на гончарному колі, вигляд згори' }, // 318 (not 320: a smiling face would be the subject)
  cardCertificate: { src: '/images/site/home-path-06-1.jpg', width: 1200, height: 1200, alt: 'Свіжу глиняну миску передають з рук у руки на тлі листя' }, // 408
  // Home market block (4:5) and «Для студій» (3:4).
  market: { src: '/images/site/home-market-1.jpg', width: 1200, height: 1500, alt: 'Миска в сирій поливі сохне на столі перед випалом' }, // 505
  forStudios: { src: '/images/site/home-studios-1.jpg', width: 1200, height: 1600, alt: 'Майстриня за столом у світлій студії, полиці з виробами, світло з вікна' }, // 57
  // Home format windows (clip-path shapes): jug 3:4, bowl and plate 1:1.
  vesselJug: { src: '/images/site/home-format-jug-1.jpg', width: 600, height: 800, alt: 'Руки майстрині формують миску з глини на турнетці' }, // 297
  vesselBowl: { src: '/images/site/home-format-bowl-1.jpg', width: 600, height: 600, alt: 'Руки формують миску на гончарному колі, крупний план' }, // 384
  vesselPlate: { src: '/images/site/home-format-plate-1.jpg', width: 600, height: 600, alt: 'Миска з блакитними хмаринками і пензель, вигляд згори' }, // 478
  // Inner pages (16:11, 1200×825), frame numbers per docs/design/photo-plan.md §4.
  bizCafes: { src: '/images/site/biz-cafes-1.jpg', width: 1200, height: 825, alt: 'Рожевий керамічний посуд і підставка для торта на дерев’яній полиці' }, // 84
  bizGifts: { src: '/images/site/biz-gifts-1.jpg', width: 1200, height: 825, alt: 'Розписані миска з хмаринками і чашка з рибками в руках' }, // 498
  bizLogo: { src: '/images/site/biz-logo-1.jpg', width: 1200, height: 825, alt: 'Відтиск штампа на сирій тарілці — так наносять знак на кераміку' }, // 542
  bizWorkshop: { src: '/images/site/biz-workshop-1.jpg', width: 1200, height: 825, alt: 'Чотири руки формують виріб з пласта глини за спільним столом' }, // 162
  bizNewYear: { src: '/images/site/biz-newyear-1.jpg', width: 1200, height: 825, alt: 'Чашка ручної роботи з червоними сердечками на полиці' }, // 82
  mkHandbuilding: { src: '/images/site/mk-lipennya-1.jpg', width: 1200, height: 825, alt: 'Стек вирізає листок із розкачаного пласта глини' }, // 139
  mkWheel: { src: '/images/site/mk-wheel-1.jpg', width: 1200, height: 825, alt: 'Руки формують чашку на гончарному колі' }, // 337
  mkPainting: { src: '/images/site/mk-paint-1.jpg', width: 1200, height: 825, alt: 'Пензель кладе блакитний ангоб на сиру миску' }, // 452
  mkCouples: { src: '/images/site/mk-couples-1.jpg', width: 1200, height: 825, alt: 'Дві пари рук на гончарному колі, вигляд згори' }, // 342
  mkCourses: { src: '/images/site/mk-courses-1.jpg', width: 1200, height: 825, alt: 'Руки витягують стінку посудини на гончарному колі' }, // 64
  mkKids: { src: '/images/site/mk-kids-1.jpg', width: 1200, height: 825, alt: 'Дитячі руки формують глину на гончарному колі, вигляд згори' }, // Unsplash, Kadir Celep (public/images/site/CREDITS.md)
  guideVydy: { src: '/images/site/guide-vydy-1.jpg', width: 1200, height: 825, alt: 'Миска в сирій поливі сохне на столі перед випалом' }, // 508
  guideGlaze: { src: '/images/site/guide-glaze-1.jpg', width: 1200, height: 825, alt: 'Миску занурюють щипцями в блакитну поливу' }, // 503
  shopShelf: { src: '/images/site/shop-shelf-1.jpg', width: 1200, height: 825, alt: 'Полиця крамнички з керамікою ручної роботи: чашки з ліпленими метеликами й квітами' }, // 12
  giftCertificates: { src: '/images/site/gift-cert-1.jpg', width: 1200, height: 825, alt: 'Дві руки передають свіжу глиняну чашку в сутінках' }, // 425
} satisfies Record<string, SitePhoto>

// A photo at the top of an inner page: a Wikimedia/stock photo with its credit, or an archive photo without one.
export type HeroPhoto = DocPhoto | SitePhoto

