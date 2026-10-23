// What the chat says before the visitor writes, by kind of page. Static text (no model call until someone writes).
export type ChatKind = 'profile' | 'business' | 'classes' | 'home' | 'other'

export type ChatOpener = { kicker: string; title: string; intro: string; chips: string[] }

export function chatOpener(kind: ChatKind, o: { studioName?: string; city?: string; classes?: boolean; business?: boolean } = {}): ChatOpener {
  const city = o.city ? ` у ${o.city}` : ''
  switch (kind) {
    case 'profile': {
      const chips = [
        ...(o.classes ? ['Як записатися на майстер-клас?', 'Скільки коштує заняття для двох?'] : []),
        ...(o.business ? ['Чи робите партію посуду для закладу?', 'Скільки коштують 50 чашок з логотипом?'] : []),
        ...(!o.classes && !o.business ? ['Чи можна замовити виріб?', 'Де подивитися роботи?'] : []),
      ].slice(0, 3)
      return {
        kicker: 'Чат · безкоштовно',
        title: o.studioName ? `Написати: ${o.studioName}` : 'Написати студії',
        intro: 'Запис, виріб чи партія. Помічник відповідає одразу з даних профілю, людина з Глини підключається, коли треба.',
        chips,
      }
    }
    case 'business':
      return {
        kicker: 'Чат · для бізнесу',
        title: 'Що потрібно і до якої дати?',
        intro: 'Скажу орієнтовні ціни й терміни, назву студії, які таке роблять, і передам один запит кільком із них.',
        chips: ['Скільки коштують 50 чашок з логотипом?', 'Які терміни на партію посуду?', 'Хто проводить корпоративи з глиною?'],
      }
    case 'classes':
      return {
        kicker: 'Чат · майстер-класи',
        title: `Куди піти на гончарство${city}?`,
        intro: 'Скільки вас, коли і який формат: коло, ліплення чи розпис. Підкажу 2–3 студії з цінами.',
        chips: ['Скільки коштує заняття для двох?', 'Є майстер-класи для дітей?', 'Де є подарунковий сертифікат?'],
      }
    case 'home':
      return {
        kicker: 'Чат · безкоштовно',
        title: 'Що шукаєте?',
        intro: 'Майстер-клас у своєму місті, подарунок з кераміки чи посуд для закладу. Помічник відповідає одразу.',
        chips: ['Майстер-клас у моєму місті', 'Подарунок з кераміки', 'Посуд для ресторану'],
      }
    default:
      return {
        kicker: 'Чат · безкоштовно',
        title: 'Напишіть, що потрібно',
        intro: 'Помічник відповідає одразу з даних каталогу, людина з Глини підключається, коли треба.',
        chips: ['Знайти студію в моєму місті', 'Скільки коштує майстер-клас?', 'Замовити партію посуду'],
      }
  }
}
