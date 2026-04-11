import { defaultSchema, type Options as RehypeSanitizeOptions } from "rehype-sanitize";

// Extends rehype-sanitize's default schema to allow:
//  1. highlight.js classes on code/span/pre (for syntax highlighting)
//  2. id on headings (for rehype-slug anchor links)
//  3. target/rel on anchor tags (for safe external links)
//  4. <kbd> tag (for keyboard shortcut display)
//
// All other untrusted HTML / scripts / event handlers are stripped by the
// inherited defaults — this is the only sanitization surface for ALL
// user-generated markdown in the app (forum posts, comments, blog, course
// materials), so any change here affects every render path.
export const sanitizeSchema: RehypeSanitizeOptions = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-/, /^hljs/],
    ],
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      ["className", /^hljs-/],
    ],
    pre: [
      ...(defaultSchema.attributes?.pre ?? []),
      ["className", /^hljs/],
    ],
    h1: [...(defaultSchema.attributes?.h1 ?? []), "id"],
    h2: [...(defaultSchema.attributes?.h2 ?? []), "id"],
    h3: [...(defaultSchema.attributes?.h3 ?? []), "id"],
    h4: [...(defaultSchema.attributes?.h4 ?? []), "id"],
    h5: [...(defaultSchema.attributes?.h5 ?? []), "id"],
    h6: [...(defaultSchema.attributes?.h6 ?? []), "id"],
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      ["target", "_blank"],
      ["rel", "nofollow", "noopener", "noreferrer"],
    ],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), "kbd"],
};
