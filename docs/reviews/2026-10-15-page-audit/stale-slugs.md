# Застарілі slug студій у редакторському контенті

Перевірено 15.10.2026: усі посилання на студії в `src/content` і `src/editorial` (ключі slug/studio/studios, посилання /vyrobnyky/…, ](slug)) звірено з публічними slug у базі. Знайдено **233 посилання в 96 файлах**: 228 на slug, яких у базі немає (студію перейменували, коли slug стали короткими), і 5 на студії, приховані з каталогу.

Що відбувається на сторінці: рендер (`PlacePicks`, `RichText`, блоки «Що обрати») мовчки відкидає ненайдену студію. Посилання зникає, назва лишається простим текстом, а в блоках-підказках пропадає сама студія, і її опис опиняється під іншою назвою (Helga «бере ціну Поляруш», GORN «робить дзеркала й столи» Pink Gentle Clouds тощо).

Що зробити: (1) замінити старі slug на поточні (у більшості — коротка форма з `displayName`); (2) збірка має падати або попереджати, якщо slug у контенті не знайдено; (3) для прихованих студій — прибрати згадку або повернути профіль.

```
src/content/cases/zola-alternatyva-posud-dlya-kavyaren-odesa.json
   odeska-keramika-zi-zmistom-ceramics-with-sense-from-odesa [немає в базі]
src/content/places/cities/chernihiv.json
   oleksii-yashchenko-honchar-rekonstruktsiia-davnoruskoi-keramiky [немає в базі]
   rodionpresent-rodion-i-olha-baievy-keramichni-horshchyky-dlia-orkhidei [немає в базі]
src/content/places/cities/dnipro.json
   honcharna-maisternia-serhiia-horbania-horban-pottery-park [немає в базі]
   studiia-zhyva-hlyna-pry-dniprovskomu-natsionalnomu-istorychnomu-muzei-im-d-i-yav [немає в базі]
src/content/places/cities/irpin.json
   here-and-now-pottery-tut-i-teper-yuliia-makliuk [немає в базі]
src/content/places/cities/ivano-frankivsk.json
   art-studiia-tsiatka-dot-if-ua-snizhana-chornii [немає в базі]
   maisternia-kramnytsia-pottery-garden-keramichnyi-sad [немає в базі]
   shkola-keramiky-fondu-frankivskyi-opir-bastion-halereia-chasu-volodymyr-rozhnov [немає в базі]
   spilne-kraftovi-produkty-kramnytsia-vsoho-ukrainskoho [немає в базі]
   folk-gunia-bazhane-ruslan-baginskyi-frolov-jamemme-guzema [немає в базі]
src/content/places/cities/kamianets-podilskyi.json
   honcharna-maisternia-u-staromu-zamku-kamianets-podilskyi-dopovnennia-kontaktiv [немає в базі]
   ho-vidrodzhennia-narodnykh-remesel-ta-promysliv-na-podilli-mykola-ta-olena-shevc [немає в базі]
   artem-maryniuk-rodynne-keramichne-vyrobnytstvo-zi-slovianska [немає в базі]
src/content/places/cities/kharkiv.json
   ania-stasenko-ta-slava-leontiev-anya-stasenko-and-slava-leontyev-farfora [немає в базі]
   ceramics-khanna-handmade-ceramics-from-ukraine [немає в базі]
src/content/places/cities/kosiv.json
   ivanna-kozak-dileta-dzbanok-ta-bohdan-dileta-kozak [немає в базі]
   kosiv-ceramics-rodynna-maisternia-ihoria-ta-khrystyny-trots [немає в базі]
   kosivskyi-derzhavnyi-instytut-dekoratyvnoho-mystetstva-kolyshnii-kipdm-lnam [немає в базі]
   kosivska-rehionalna-orhanizatsiia-natsionalnoi-spilky-khudozhnykiv-ukrainy-tvorc [немає в базі]
   muzei-narodnoho-mystetstva-ta-pobutu-hutsulshchyny-kosiv [немає в базі]
src/content/places/cities/kryvyi-rih.json
   keramichna-maisternia-ceramic-masterska-danylo-maleran [немає в базі]
   keramika-kryvyi-rih-zaniattia-z-keramiky-vul-koliina-2 [в базі, але не публічний]
   shelter-studiia-keramiky-kulturno-hromadskoho-tsentru [немає в базі]
src/content/places/cities/kyiv.json
   glynar-honcharna-na-liuteranskii-maisternia-hlynar [немає в базі]
   lepite-keramichnyi-kovorkinh-u-vyrobnykakh-mrii [немає в базі]
   tsum-kyiv-tsum-kyiv-poverkh-ukrainskykh-brendiv [немає в базі]
   kafedra-khudozhnoi-keramiky-dereva-skulptury-ta-metalu-kdadpmd-im-mykhaila-boich [немає в базі]
src/content/places/cities/lutsk.json
   honcharna-studiia-lutsk-vul-drahomanova-1a-mk-na-tvoie [немає в базі]
   honcharnyi-prostir-mykoly-shavuly-lutsk-vul-kivertsivska-9b [немає в базі]
   volynskyi-kraieznavchyi-muzei-mk-z-davnoslovianskoho-liplennia-posudu-vystavky-k [немає в базі]
   volynskyi-fakhovyi-koledzh-kultury-i-mystetstv-imeni-i-f-stravinskoho-op-obrazot [немає в базі]
   hurtok-keramiky-hlyniana-skarbnychka-zosh-no24-lutsk [немає в базі]
src/content/places/cities/lviv.json
   lvivska-eksperymentalna-keramiko-skulpturna-fabryka-leksf [немає в базі]
   ok-ceramics-romakoceramics-viktoriia-romanchuk-i-oleksii-konoshenko [немає в базі]
   zirka-z-neba-tvorcha-maisternia-honcharstvo-ta-lipka-u-lvovi [немає в базі]
src/content/places/cities/mykolaiv.json
   ho-tsentr-navchannia-i-osvity-doroslykh-pivden-maisternia-tavriiskoho-rozpysu [немає в базі]
   honcharni-maister-klasy-u-mykolaievi-partner-kava [немає в базі]
src/content/places/cities/myrhorod.json
   myrhorodskyi-fakhovyi-koledzh-imeni-mykoly-hoholia-kol-myrhorodskyi-khudozhno-pr [немає в базі]
   maisternia-hlynka-dobra-hlyna [в базі, але не публічний]
src/content/places/cities/odesa.json
   maister-klasy-odesa-epoksydna-smola-liplennia-keramiky-svichky [немає в базі]
   odeska-keramika-zi-zmistom-ceramics-with-sense-from-odesa [немає в базі]
   avtorska-keramika-honcharstvo-mk-mariia-grin-odesa [немає в базі]
src/content/places/cities/opishne.json
   keramokramnytsia-kramnytsia-natsionalnoho-muzeiu-zapovidnyka-ukrainskoho-honchar [немає в базі]
   opishnianska-artil-kp-opishnianskoi-selyshchnoi-rady [немає в базі]
src/content/places/cities/poltava.json
   rattleclay-retlkley-avtorska-keramika-ruchnoi-roboty [немає в базі]
   rattleclay-studio-maister-klasy-z-keramiky-poltava [немає в базі]
src/content/places/cities/rivne.json
   rivnenskyi-oblasnyi-tsentr-narodnoi-tvorchosti-kolektsiia-honcharstva [немає в базі]
src/content/places/cities/sloviansk.json
   molochena-slovianska-keramika-element-nks-donechchyny [немає в базі]
src/content/places/cities/sumy.json
   come-to-geza-keramichna-maisternia-kateryny-hiezy [немає в базі]
src/content/places/cities/uzhhorod.json
   kafedra-dpm-khudozhnia-keramika-zakarpatska-akademiia-mystetstv-fakhovyi-koledzh [немає в базі]
src/content/places/cities/vinnytsia.json
   ubodecor-ubo-keramika-ta-svichky-ruchnoi-roboty [немає в базі]
   honcharstvo-v-temriavi-shkola-honcharstva-dlia-nezriachykh-veteraniv [немає в базі]
src/content/places/cities/zaporizhzhia.json
   pottery-island-honcharnyi-ostriv-maisternia-oleksandra-shkalikova [немає в базі]
   tezia-ceramics-studiia-keramiky-teziia-ranishe-shalene-kolo [немає в базі]
   zaporizka-dytiacha-khudozhnia-shkola-kurs-keramika-dlia-doroslykh [немає в базі]
src/content/places/cities/zhytomyr.json
   studiia-keramiky-obiednani-vohnem-fire-of-unity [немає в базі]
   ekspresiia-dasha-avtorska-keramika-z-chervonoi-hlyny [немає в базі]
src/content/places/products/chashky.json
   rattleclay-retlkley-avtorska-keramika-ruchnoi-roboty [немає в базі]
   ubodecor-ubo-keramika-ta-svichky-ruchnoi-roboty [немає в базі]
   maisternia-popovykh-viktoriia-ta-bohdan-popovy [немає в базі]
src/content/places/products/prykrasy.json
   n-a-yi-v-keramichni-prykrasy-ceramic-necklaces [немає в базі]
   bigme-ua-bihme-keramichni-prykrasy-ceramic-jewerly [немає в базі]
   yevheniia-zharkova-jeva-smith-maistrynia-keramiky [немає в базі]
src/content/places/products/svitylnyky.json
   kosiv-ceramics-rodynna-maisternia-ihoria-ta-khrystyny-trots [немає в базі]
   maisternia-kramnytsia-pottery-garden-keramichnyi-sad [немає в базі]
src/content/places/products/tarilky-i-mysky.json
   ivanna-kozak-dileta-dzbanok-ta-bohdan-dileta-kozak [немає в базі]
src/content/places/products/vazy-i-dekor.json
   here-and-now-pottery-tut-i-teper-yuliia-makliuk [немає в базі]
   artem-maryniuk-rodynne-keramichne-vyrobnytstvo-zi-slovianska [немає в базі]
src/content/topics/products.ts
   tarilky-i-mysky [немає в базі]
   vazy-i-dekor [немає в базі]
   plytka-i-panno [немає в базі]
src/content/waveA/de-kupyty-keramiku.json
   karpatiia-kramnytsia-karpatskykh-vyrobiv-kosiv [немає в базі]
   keramokramnytsia-kramnytsia-natsionalnoho-muzeiu-zapovidnyka-ukrainskoho-honchar [немає в базі]
   shoste-chuttia-internet-mahazyn-vyrobiv-ruchnoi-roboty [немає в базі]
   oleksandr-miroshnychenko-oleksandr-miroshnychenko [в базі, але не публічний]
src/content/waveA/etsy-shops.json
   here-and-now-pottery-tut-i-teper-yuliia-makliuk [немає в базі]
   ok-ceramics-romakoceramics-viktoriia-romanchuk-i-oleksii-konoshenko [немає в базі]
src/content/waveA/mk-chernihiv-lipennya.json
   honcharna-maisternia-chernihivskoho-oblasnoho-tsentru-naukovo-tekhnichnoi-tvorch [немає в базі]
   oleksii-yashchenko-honchar-rekonstruktsiia-davnoruskoi-keramiky [немає в базі]
src/content/waveA/mk-den-narodzhennya.json
   maister-klasy-odesa-epoksydna-smola-liplennia-keramiky-svichky [немає в базі]
   glynar-honcharna-na-liuteranskii-maisternia-hlynar [немає в базі]
   studiia-keramiky-marii-poliarush-maria-polyarush-ceramics-studio [немає в базі]
   honcharna-maisternia-serhiia-horbania-horban-pottery-park [немає в базі]
   opishnianska-artil-kp-opishnianskoi-selyshchnoi-rady [немає в базі]
src/content/waveA/mk-dnipro-dlya-ditey.json
   honcharna-maisternia-serhiia-horbania-horban-pottery-park [немає в базі]
   studiia-zhyva-hlyna-pry-dniprovskomu-natsionalnomu-istorychnomu-muzei-im-d-i-yav [немає в базі]
src/content/waveA/mk-dnipro-dlya-dvokh.json
   honcharna-maisternia-serhiia-horbania-horban-pottery-park [немає в базі]
src/content/waveA/mk-dnipro-honcharne-kolo.json
   honcharna-maisternia-serhiia-horbania-horban-pottery-park [немає в базі]
src/content/waveA/mk-dnipro-kursy.json
   honcharna-maisternia-serhiia-horbania-horban-pottery-park [немає в базі]
src/content/waveA/mk-dnipro-lipennya.json
   honcharna-maisternia-serhiia-horbania-horban-pottery-park [немає в базі]
   studiia-zhyva-hlyna-pry-dniprovskomu-natsionalnomu-istorychnomu-muzei-im-d-i-yav [немає в базі]
src/content/waveA/mk-dnipro-rozpys.json
   honcharna-maisternia-serhiia-horbania-horban-pottery-park [немає в базі]
src/content/waveA/mk-irpin-lipennya.json
   here-and-now-pottery-tut-i-teper-yuliia-makliuk [немає в базі]
src/content/waveA/mk-ivano-frankivsk-dlya-ditey.json
   shkola-keramiky-fondu-frankivskyi-opir-bastion-halereia-chasu-volodymyr-rozhnov [немає в базі]
   art-studiia-tsiatka-dot-if-ua-snizhana-chornii [немає в базі]
src/content/waveA/mk-ivano-frankivsk-honcharne-kolo.json
   shkola-keramiky-fondu-frankivskyi-opir-bastion-halereia-chasu-volodymyr-rozhnov [немає в базі]
   art-studiia-tsiatka-dot-if-ua-snizhana-chornii [немає в базі]
src/content/waveA/mk-ivano-frankivsk-kursy.json
   maisternia-kramnytsia-pottery-garden-keramichnyi-sad [немає в базі]
src/content/waveA/mk-ivano-frankivsk-lipennya.json
   shkola-keramiky-fondu-frankivskyi-opir-bastion-halereia-chasu-volodymyr-rozhnov [немає в базі]
src/content/waveA/mk-kharkiv-dlya-ditey.json
   tvorche-obiednannia-etyka-pedahohika-keramika-keramichna-studiia-kharkova [немає в базі]
   rukamy-ceramics-and-art-studio-dlia-ditei-ta-doroslykh [немає в базі]
src/content/waveA/mk-kharkiv-dlya-dvokh.json
   keramika-kharkiv-studiia-bilia-m-botanichnyi-sad [немає в базі]
src/content/waveA/mk-kharkiv-honcharne-kolo.json
   rukamy-ceramics-and-art-studio-dlia-ditei-ta-doroslykh [немає в базі]
   tvorche-obiednannia-etyka-pedahohika-keramika-keramichna-studiia-kharkova [немає в базі]
src/content/waveA/mk-kharkiv-lipennya.json
   ceramics-khanna-handmade-ceramics-from-ukraine [немає в базі]
   keramika-kharkiv-studiia-bilia-m-botanichnyi-sad [немає в базі]
   tvorche-obiednannia-etyka-pedahohika-keramika-keramichna-studiia-kharkova [немає в базі]
src/content/waveA/mk-kharkiv-rozpys.json
   tvorche-obiednannia-etyka-pedahohika-keramika-keramichna-studiia-kharkova [немає в базі]
   ania-stasenko-ta-slava-leontiev-anya-stasenko-and-slava-leontyev-farfora [немає в базі]
src/content/waveA/mk-kryvyi-rih-dlya-ditey.json
   shelter-studiia-keramiky-kulturno-hromadskoho-tsentru [немає в базі]
src/content/waveA/mk-kryvyi-rih-honcharne-kolo.json
   shelter-studiia-keramiky-kulturno-hromadskoho-tsentru [немає в базі]
   keramichna-maisternia-ceramic-masterska-danylo-maleran [немає в базі]
src/content/waveA/mk-kryvyi-rih-lipennya.json
   keramika-kryvyi-rih-zaniattia-z-keramiky-vul-koliina-2 [в базі, але не публічний]
   keramichna-maisternia-ceramic-masterska-danylo-maleran [немає в базі]
src/content/waveA/mk-kyiv-dlya-ditey.json
   studiia-suchasnoi-ukrainskoi-keramiky-nvk-doprofesiinoi-pidhotovky-ta-tekhnichno [немає в базі]
   tsentr-tvorchosti-ditei-ta-yunatstva-sviatoshynskoho-raionu-m-kyieva-hurtok-khud [немає в базі]
   kyivskyi-palats-ditei-ta-yunatstva-maisternia-keramichnoho-mystetstva-kerivnytsi [немає в базі]
   glynar-honcharna-na-liuteranskii-maisternia-hlynar [немає в базі]
   studiia-keramiky-marii-poliarush-maria-polyarush-ceramics-studio [немає в базі]
src/content/waveA/mk-kyiv-dlya-dvokh.json
   glynar-honcharna-na-liuteranskii-maisternia-hlynar [немає в базі]
   studiia-keramiky-marii-poliarush-maria-polyarush-ceramics-studio [немає в базі]
src/content/waveA/mk-kyiv-honcharne-kolo.json
   glynar-honcharna-na-liuteranskii-maisternia-hlynar [немає в базі]
   studiia-keramiky-marii-poliarush-maria-polyarush-ceramics-studio [немає в базі]
   kyiv-hlynoterapiia-keramika-lipka-honcharstvo-mk [немає в базі]
   tsentr-tvorchosti-ditei-ta-yunatstva-sviatoshynskoho-raionu-m-kyieva-hurtok-khud [немає в базі]
src/content/waveA/mk-kyiv-kursy.json
   glynar-honcharna-na-liuteranskii-maisternia-hlynar [немає в базі]
   studiia-keramiky-marii-poliarush-maria-polyarush-ceramics-studio [немає в базі]
src/content/waveA/mk-kyiv-lipennya.json
   studiia-keramiky-marii-poliarush-maria-polyarush-ceramics-studio [немає в базі]
   glynar-honcharna-na-liuteranskii-maisternia-hlynar [немає в базі]
   kyiv-hlynoterapiia-keramika-lipka-honcharstvo-mk [немає в базі]
   studiia-suchasnoi-ukrainskoi-keramiky-nvk-doprofesiinoi-pidhotovky-ta-tekhnichno [немає в базі]
   tsentr-tvorchosti-ditei-ta-yunatstva-sviatoshynskoho-raionu-m-kyieva-hurtok-khud [немає в базі]
   kyivskyi-palats-ditei-ta-yunatstva-maisternia-keramichnoho-mystetstva-kerivnytsi [немає в базі]
src/content/waveA/mk-kyiv-rozpys.json
   glynar-honcharna-na-liuteranskii-maisternia-hlynar [немає в базі]
   studiia-keramiky-marii-poliarush-maria-polyarush-ceramics-studio [немає в базі]
src/content/waveA/mk-lutsk-dlya-ditey.json
   honcharna-studiia-lutsk-vul-drahomanova-1a-mk-na-tvoie [немає в базі]
   hurtok-keramiky-hlyniana-skarbnychka-zosh-no24-lutsk [немає в базі]
   zhanna-myliashkevych-studiia-horniatko-shkola-no23 [немає в базі]
   honcharnyi-prostir-mykoly-shavuly-lutsk-vul-kivertsivska-9b [немає в базі]
src/content/waveA/mk-lutsk-honcharne-kolo.json
   honcharna-studiia-lutsk-vul-drahomanova-1a-mk-na-tvoie [немає в базі]
   honcharnyi-prostir-mykoly-shavuly-lutsk-vul-kivertsivska-9b [немає в базі]
   zhanna-myliashkevych-studiia-horniatko-shkola-no23 [немає в базі]
src/content/waveA/mk-lutsk-lipennya.json
   honcharna-studiia-lutsk-vul-drahomanova-1a-mk-na-tvoie [немає в базі]
   volynskyi-kraieznavchyi-muzei-mk-z-davnoslovianskoho-liplennia-posudu-vystavky-k [немає в базі]
   hurtok-keramiky-hlyniana-skarbnychka-zosh-no24-lutsk [немає в базі]
   zhanna-myliashkevych-studiia-horniatko-shkola-no23 [немає в базі]
   honcharnyi-prostir-mykoly-shavuly-lutsk-vul-kivertsivska-9b [немає в базі]
src/content/waveA/mk-lviv-dlya-ditey.json
   shevchenkivskyi-hai-mk-z-honcharstva-u-honcharni-z-potelycha [немає в базі]
   zirka-z-neba-tvorcha-maisternia-honcharstvo-ta-lipka-u-lvovi [немає в базі]
src/content/waveA/mk-lviv-dlya-dvokh.json
   zirka-z-neba-tvorcha-maisternia-honcharstvo-ta-lipka-u-lvovi [немає в базі]
src/content/waveA/mk-lviv-honcharne-kolo.json
   shevchenkivskyi-hai-mk-z-honcharstva-u-honcharni-z-potelycha [немає в базі]
   zirka-z-neba-tvorcha-maisternia-honcharstvo-ta-lipka-u-lvovi [немає в базі]
src/content/waveA/mk-lviv-kursy.json
   zirka-z-neba-tvorcha-maisternia-honcharstvo-ta-lipka-u-lvovi [немає в базі]
src/content/waveA/mk-lviv-lipennya.json
   shevchenkivskyi-hai-mk-z-honcharstva-u-honcharni-z-potelycha [немає в базі]
   zirka-z-neba-tvorcha-maisternia-honcharstvo-ta-lipka-u-lvovi [немає в базі]
src/content/waveA/mk-lviv-rozpys.json
   zirka-z-neba-tvorcha-maisternia-honcharstvo-ta-lipka-u-lvovi [немає в базі]
   shevchenkivskyi-hai-mk-z-honcharstva-u-honcharni-z-potelycha [немає в базі]
src/content/waveA/mk-odesa-dlya-ditey.json
   studiia-we-can-honcharna-maisternist-yekts-beit-grand [немає в базі]
   art-studyia-maliuvannia-liplennia-valiannia-hlyna-maliunok-rysovanye [немає в базі]
   maister-klasy-odesa-epoksydna-smola-liplennia-keramiky-svichky [немає в базі]
src/content/waveA/mk-odesa-dlya-dvokh.json
   maister-klasy-odesa-epoksydna-smola-liplennia-keramiky-svichky [немає в базі]
src/content/waveA/mk-odesa-honcharne-kolo.json
   studiia-we-can-honcharna-maisternist-yekts-beit-grand [немає в базі]
   avtorska-keramika-honcharstvo-mk-mariia-grin-odesa [немає в базі]
src/content/waveA/mk-odesa-kursy.json
   studiia-we-can-honcharna-maisternist-yekts-beit-grand [немає в базі]
   avtorska-keramika-honcharstvo-mk-mariia-grin-odesa [немає в базі]
src/content/waveA/mk-odesa-lipennya.json
   maister-klasy-odesa-epoksydna-smola-liplennia-keramiky-svichky [немає в базі]
   avtorska-keramika-honcharstvo-mk-mariia-grin-odesa [немає в базі]
   art-studyia-maliuvannia-liplennia-valiannia-hlyna-maliunok-rysovanye [немає в базі]
   studiia-we-can-honcharna-maisternist-yekts-beit-grand [немає в базі]
src/content/waveA/mk-sumy-honcharne-kolo.json
   come-to-geza-keramichna-maisternia-kateryny-hiezy [немає в базі]
src/content/waveA/mk-sumy-lipennya.json
   come-to-geza-keramichna-maisternia-kateryny-hiezy [немає в базі]
src/content/waveA/mk-vinnytsia-honcharne-kolo.json
   honcharstvo-v-temriavi-shkola-honcharstva-dlia-nezriachykh-veteraniv [немає в базі]
src/content/waveA/mk-vinnytsia-lipennya.json
   honcharstvo-v-temriavi-shkola-honcharstva-dlia-nezriachykh-veteraniv [немає в базі]
src/content/waveA/mk-zaporizhzhia-dlya-ditey.json
   tezia-ceramics-studiia-keramiky-teziia-ranishe-shalene-kolo [немає в базі]
   pottery-island-honcharnyi-ostriv-maisternia-oleksandra-shkalikova [немає в базі]
   zaporizka-dytiacha-khudozhnia-shkola-kurs-keramika-dlia-doroslykh [немає в базі]
src/content/waveA/mk-zaporizhzhia-honcharne-kolo.json
   zaporizka-dytiacha-khudozhnia-shkola-kurs-keramika-dlia-doroslykh [немає в базі]
   pottery-island-honcharnyi-ostriv-maisternia-oleksandra-shkalikova [немає в базі]
   tezia-ceramics-studiia-keramiky-teziia-ranishe-shalene-kolo [немає в базі]
src/content/waveA/mk-zaporizhzhia-lipennya.json
   tezia-ceramics-studiia-keramiky-teziia-ranishe-shalene-kolo [немає в базі]
   zaporizka-dytiacha-khudozhnia-shkola-kurs-keramika-dlia-doroslykh [немає в базі]
src/content/waveA/mk-zaporizhzhia-rozpys.json
   tezia-ceramics-studiia-keramiky-teziia-ranishe-shalene-kolo [немає в базі]
src/content/waveA/mk-zhytomyr-dlya-ditey.json
   studiia-keramiky-obiednani-vohnem-fire-of-unity [немає в базі]
src/content/waveA/mk-zhytomyr-honcharne-kolo.json
   studiia-keramiky-obiednani-vohnem-fire-of-unity [немає в базі]
src/content/waveA/mk-zhytomyr-lipennya.json
   studiia-keramiky-obiednani-vohnem-fire-of-unity [немає в базі]
src/content/waveA/podarunky-z-keramiky.json
   kosiv-ceramics-rodynna-maisternia-ihoria-ta-khrystyny-trots [немає в базі]
   ubodecor-ubo-keramika-ta-svichky-ruchnoi-roboty [немає в базі]
   bigme-ua-bihme-keramichni-prykrasy-ceramic-jewerly [немає в базі]
   n-a-yi-v-keramichni-prykrasy-ceramic-necklaces [немає в базі]
   glynar-honcharna-na-liuteranskii-maisternia-hlynar [немає в базі]
src/content/waveB/brendy-posudu.json
   rattleclay-retlkley-avtorska-keramika-ruchnoi-roboty [немає в базі]
   ubodecor-ubo-keramika-ta-svichky-ruchnoi-roboty [немає в базі]
src/content/waveB/chornodymlena-i-molochena.json
   oseredok-chornodymlenoi-keramiky-v-sheptytskomu-chervonohradi [немає в базі]
   molochena-slovianska-keramika-element-nks-donechchyny [немає в базі]
   studiia-keramiky-obiednani-vohnem-fire-of-unity [немає в базі]
   viktor-androshchuk-maister-chornodymlenoi-keramiky [немає в базі]
   honcharnyi-prostir-mykoly-shavuly-lutsk-vul-kivertsivska-9b [немає в базі]
src/content/waveB/etsy.json
   ok-ceramics-romakoceramics-viktoriia-romanchuk-i-oleksii-konoshenko [немає в базі]
   here-and-now-pottery-tut-i-teper-yuliia-makliuk [немає в базі]
src/content/waveB/museums.json
   natsionalnyi-muzei-narodnoho-mystetstva-hutsulshchyny-ta-pokuttia-imeni-yosafata [немає в базі]
   muzei-narodnoho-mystetstva-ta-pobutu-hutsulshchyny-kosiv [немає в базі]
   muzei-honcharnoho-mystetstva-muzei-sadyba-brativ-herasymenkiv [немає в базі]
   volynskyi-kraieznavchyi-muzei-mk-z-davnoslovianskoho-liplennia-posudu-vystavky-k [немає в базі]
   muzei-davnoruskoho-honcharstva-vyshhorodskyi-istoryko-kulturnyi-zapovidnyk [немає в базі]
src/content/waveB/pratsyuyut-z-biznesom.json
   glynar-honcharna-na-liuteranskii-maisternia-hlynar [немає в базі]
   odeska-keramika-zi-zmistom-ceramics-with-sense-from-odesa [немає в базі]
   ok-ceramics-romakoceramics-viktoriia-romanchuk-i-oleksii-konoshenko [немає в базі]
   studiia-keramiky-marii-poliarush-maria-polyarush-ceramics-studio [немає в базі]
src/content/waveB/vydy-keramiky.json
   serhii-denysenko-dynastiia-vasylkivskoi-maioliky [немає в базі]
   here-and-now-pottery-tut-i-teper-yuliia-makliuk [немає в базі]
   bigme-ua-bihme-keramichni-prykrasy-ceramic-jewerly [немає в базі]
   ania-stasenko-ta-slava-leontiev-anya-stasenko-and-slava-leontyev-farfora [немає в базі]
   studiia-keramiky-marii-poliarush-maria-polyarush-ceramics-studio [немає в базі]
src/content/waveB/yalynkovi-prykrasy.json
   ivanna-kozak-dileta-dzbanok-ta-bohdan-dileta-kozak [немає в базі]
   glynar-honcharna-na-liuteranskii-maisternia-hlynar [немає в базі]
   ceramics-khanna-handmade-ceramics-from-ukraine [немає в базі]
src/content/waveC/newyear.json
   ivanna-kozak-dileta-dzbanok-ta-bohdan-dileta-kozak [немає в базі]
   keramokramnytsia-kramnytsia-natsionalnoho-muzeiu-zapovidnyka-ukrainskoho-honchar [немає в базі]
   glynar-honcharna-na-liuteranskii-maisternia-hlynar [немає в базі]
   maisternia-hlynka-dobra-hlyna [в базі, але не публічний]
   ceramics-khanna-handmade-ceramics-from-ukraine [немає в базі]
   rattleclay-retlkley-avtorska-keramika-ruchnoi-roboty [немає в базі]
   kyiv-hlynoterapiia-keramika-lipka-honcharstvo-mk [немає в базі]
src/content/waveC/novyi-rik-i-rizdvo.json
   keramokramnytsia-kramnytsia-natsionalnoho-muzeiu-zapovidnyka-ukrainskoho-honchar [немає в базі]
   ivanna-kozak-dileta-dzbanok-ta-bohdan-dileta-kozak [немає в базі]
   glynar-honcharna-na-liuteranskii-maisternia-hlynar [немає в базі]
   kyiv-hlynoterapiia-keramika-lipka-honcharstvo-mk [немає в базі]
src/content/waveC/podarunky-spivrobitnykam.json
   ok-ceramics-romakoceramics-viktoriia-romanchuk-i-oleksii-konoshenko [немає в базі]
   studiia-keramiky-marii-poliarush-maria-polyarush-ceramics-studio [немає в базі]
src/content/waveC/richnytsya-kompaniyi.json
   studiia-keramiky-marii-poliarush-maria-polyarush-ceramics-studio [немає в базі]
   zirka-z-neba-tvorcha-maisternia-honcharstvo-ta-lipka-u-lvovi [немає в базі]
   glynar-honcharna-na-liuteranskii-maisternia-hlynar [немає в базі]
```
