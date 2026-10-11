// Cases moved under their studios (/vyrobnyky/<studio>/keisy/<case>); there is no site-wide index any more.
export function GET(req: Request) {
  return Response.redirect(new URL('/dlya-biznesu', req.url), 301)
}
