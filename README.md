## NOTE

This project is deprecated in favor for the official plugin: [@directus/gatsby-source](https://github.com/directus/gatsby-source). This version will no longer be maintained.

# gatsby-source-directus7

Source plugin for pulling data into [Gatsby](https://github.com/gatsbyjs) from [Directus CMS](https://getdirectus.com/). Inspired by [iKonrad's original plugin](https://github.com/iKonrad/gatsby-source-directus/).

## Features

This plugin pulls all your Directus Collections and creates Gatsby nodes for them. It maps through all the Many-To-One and Many-To-Many -relationships between your Collections, and links them for extra comfy GraphQL querying.

For example, if you have a `Posts` collection, you'll get access to `allDirectusPost` and `directusPost` queries which return Items in the Collection. If your `Posts` have a relation to a `Categories` -collection with the same field name, the `Category` objects can be found right in the `Post` GraphQL object.

This plugin uses [gatsby-source-filesystem](https://www.gatsbyjs.org/packages/gatsby-source-filesystem/) to download all the files in Directus's uploads and link them to their respective Items's fields for simple usability. If you use lots of images in you project, take a look at also installing [gatsby-plugin-sharp](https://www.gatsbyjs.org/packages/gatsby-plugin-sharp/) and [gatsby-transformer-sharp](https://www.gatsbyjs.org/packages/gatsby-transformer-sharp/).

This works really well with Gatsby's `createPages` function if you want to dynamically create content such as Blog posts from Directus, for instance.

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
      resolve: 'gatsby-source-directus7',
      options: {
        /**
         * The base URL of Directus.
         */
        url: 'https://directus.example.com',
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
         * Optional - set the status of the items you want to receive. E.g. if you functionality
         * want to receive items with status 'published'.
         * `targetStatus` sets the status you want the items to have. `defaultStatus`
         * defines a fallback status that will also be accepted (e.g. you want
         * items with status 'draft', but 'published' is also acceptable)
         *
         */
        targetStatus: 'draft',
        defaultStatus: 'published'
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

### Example with Gatsby's `createPages`

This example assumes that you have created a `posts` collection in Directus with `title`, `author` and `content` fields, and a barebones Gatsby app. Add the following files to your Gatsby project:

`./gatsby-node.js`

```javascript
const path = require('path');

// Gatsby function that runs during build after generating GraphQL store
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
            // Used as a query argument in the component below
            id: node.directusId,
          },
        });
        console.log(`Generated post '${node.title}' to path '/${url}'`);
      } catch (error) {
        console.error(`Failed to generate post '${node.title}': ${error}`);
      }
    });
  } catch (error) {
    console.error(`GraphQL query returned error: ${error}`);
  }
};
```

`./src/templates/post.jsx`

```javascript
import React from 'react';
import { graphql } from 'gatsby';

// Basic post component
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

// Query to be ran on build, passes resulting JSON as 'data' prop
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

- Implement markdown processing with something like [gatsby-transformer-remark](https://www.gatsbyjs.org/packages/gatsby-transformer-remark/)
- Consider adding in rest of the data provided by Directus (users and activity for example)

## Contributions

Contributions are always welcome, if you come up with any feature requests, ideas or bugs just create an issue or a pull request!
