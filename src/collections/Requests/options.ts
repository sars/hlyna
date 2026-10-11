export const REQUEST_WHAT_OPTIONS = [
  { label: 'Посуд для закладу', value: 'tableware' },
  { label: 'Чашки з логотипом', value: 'logo-mugs' },
  { label: 'Корпоративні подарунки', value: 'corporate-gifts' },
  { label: 'Корпоратив з ліплення з глини', value: 'corporate-workshop' },
  { label: 'Майстер-клас', value: 'master-class' },
  { label: 'Інше', value: 'other' },
  { label: 'Студія: додати / оновити профіль', value: 'studio' },
] as const

export const REQUEST_STATUS_OPTIONS = [
  { label: 'Новий', value: 'new' },
  { label: 'В роботі', value: 'in_progress' },
  { label: 'Переслано студіям', value: 'forwarded' },
  { label: 'Студія відповіла', value: 'replied' },
  { label: 'Угода', value: 'deal' },
  { label: 'Втрачено', value: 'lost' },
  { label: 'Оброблено / перенесено', value: 'closed' },
] as const
