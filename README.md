# gatsby-source-directus

Source plugin for pulling data into [Gatsby](https://github.com/gatsbyjs) from [Directus CMS](https://getdirectus.com/). Based heavily on [iKonrad's original plugin](https://github.com/iKonrad/gatsby-source-directus/).

## Features

This plugin pulls all your Directus Collections and creates Gatsby nodes for it.

For example, if you have a `Posts` collection, you'll get access to `allDirectusPost` and `directusPost` queries which return Items in the Collection.

It works well with Gatsby's `createPages` function if you want to dynamically create Blog posts from Directus, for instance.

## Installation Guide

- [Install Gatsby](https://www.gatsbyjs.org/docs/)
- Install plugin by running npm `npm i gatsby-source-directus7 -S`
- Configure the plugin in `gatsby-config.js` file:

```javascript
module.exports = {
  siteMetadata: {
    title: 'A sample site using Directus API',
    subtitle: 'My sample site using Directus',
  },
  plugins: [
    {
      resolve: 'gatsby-source-directus',
      options: {
        /**
         * The base URL of Directus.
         */
        url: 'directus.example.com',
        /**
         * Directus project to connect to, if empty defaults to '_' (Directus's default project name).
         */
        project: '_',
        /**
         * If your Directus installation needs authorization to access the required api,
         * you'll also need to supply the credentials here. In addition to your own
         * Collections, the Directus System Collections 'Collections', 'Files'
         * and 'Relations' should be readable either to the Public group
         * or the user account you provide.
         */
        email: 'example@directususer.com',
        password: 'password123',
        /**
         * This plugin will automatically transform plural table names into their singular counterparts.
         * However, if the name generated isn't correct, you can overwrite it
         * by setting the 'nameExceptions` object.
         * So, on the example below, a collection "Posts", will be transformed
         * to "Article" node type.
         * This config is optional.
         */
        nameExceptions: {
          posts: 'Article',
        },
      },
    },
  ],
};
```

## Usage

For every Collection in Directus, the plugin will create a separate node with `Directus` prefix.

So, for your `posts` and `categories` Collections, the queries would be `directusPost`, `allDirectusPost` and `directusCategory`, `allDirectusCategory`.

This plugin is using [Pluralize](https://github.com/blakeembrey/pluralize) module to transform plural table names into singular node types to conform to the Gatsby naming convention.
If for some reason, the generated name doesn't seem right, you can overwrite the node name using the `nameExceptions` object in the plugin config. (see example above)

### Example plugin with Gatsby's `createPages`

This example assumes that you have created a `posts` collection in Directus with `title`, `author` and `content` fields.
It will use `src/templates/post.jsx` file as your template file.

`./gatsby-node.js`

```javascript
const path = require('path');

exports.createPages = async ({ actions, graphql }) => {
  const { createPage } = actions;
  try {
    const result = await graphql(`
      {
        allDirectusPost {
          edges {
            node {
              directusId
              title
            }
          }
        }
      }
    `);

    result.data.allDirectusPost.edges.map(edge => {
      try {
        const node = edge.node;
        const url = `post/${node.directusId}`;
        createPage({
          path: url,
          component: path.resolve('src/templates/post.jsx'),
          context: {
            id: node.directusId,
          },
        });
        console.log(`Generated post '${url}'`);
      } catch (error) {
        console.error(`Failed to generate page '${node.title}': ${error}`);
      }
    });
  } catch (error) {
    console.error(`GraphQL query returned errors: ${error}`);
  }
};
```

`./src/templates/post.jsx`

```javascript
import React from 'react';
import { graphql } from 'gatsby';

export default ({ data }) => {
  const post = data.directusPost;
  return (
    <div>
      <h1>{post.title}</h1>
      <p>Posted by {post.author}</p>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </div>
  );
};

export const query = graphql`
  query($id: Int!) {
    directusPost(directusId: { eq: $id }) {
      title
      author
      content
    }
  }
`;
```

## To do

For now, the plugin only handles Collections and Files.

I'm planning to extend the plugin to build better GraphQL relations from Directus's Many-To-One and Many-To-Many -relations

## Contributions

Feel free to contribute if you feel something's missing.
