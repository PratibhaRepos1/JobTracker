Drop two markdown files into this folder before running /api/tailor:

  base_resume.md    your full resume in markdown
  base_cover.md     your cover letter template in markdown

The tailor endpoint reads these on every request, so you can edit them
freely without restarting the backend. They are NEVER mutated by the app —
the tailored output is stored in the database, the originals stay intact.

Resume formatting hints (the docx/PDF renderers handle these):
  # Name / contact line          (top-level H1)
  ## Summary, Experience, ...    (section H2)
  ### Role at Company             (sub-H3 for jobs)
  - bullet                        (achievements)
  **bold** and *italic*           (used for emphasis)

Delete this file once you've added your real assets.
