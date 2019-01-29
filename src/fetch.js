import 'babel-polyfill';
import DirectusSDK from "@directus/sdk-js";
import Colors from 'colors';

export default class DirectusFetcher {
    constructor(apiKey, url, version, requestParams, fileRequestParams) {
        this.apiKey = apiKey;
        this.url = url;
        this.version = version;
        this.requestParams = requestParams;
        this.fileRequestParams = fileRequestParams;
        // Initialize client
        this.client = new DirectusSDK({
            url: this.url,
        });
    }

    async getAllCollectionsData() {
        // Get all the collections available from Directus
        const collectionsData = await this.client.getCollections();

        // Iterate through the collections and pull the data for each
        if (collectionsData.data === undefined) {
            console.error(`\ngatsby-source-directus`.blue, 'error'.red, `gatsby-source-directus: An error occurred while fetching the table list.`, collectionsData);
            return;
        }

        const collections = collectionsData.data
            .filter(collection => !collection.collection.startsWith("directus_"));

        return collections;
    }

    async getAllFiles() {
        //Get all files from Directus
        const filesData = await this.client.getFiles(this.fileRequestParams);

        if (filesData.data === undefined) {
            console.error(`\ngatsby-source-directus`.blue, 'error'.red, `gatsby-source-directus: An error occurred while fetching the files.`, filesData);
            return;
        }

        return filesData.data;
    }

    async getAllItemsForCollection(name) {
        const records = await this.client.getItems(name);
        return records.data;
    }
}
