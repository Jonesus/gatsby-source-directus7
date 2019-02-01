import 'babel-polyfill';
import DirectusSDK from '@directus/sdk-js';
import Colors from 'colors'; // eslint-disable-line
import { error } from './process';

/**
 * Class with methods for fetching data from Directus
 * via their JS SDK
 */
export default class DirectusFetcher {
    constructor(url, project, email, password) {
        this.email = email;
        this.password = password;
        try {
            this.client = new DirectusSDK({
                url,
                project: project || '_',
            });
        } catch (e) {
            error(`Error initializing DirectusFetcher: ${e}`);
        }
    }

    /**
     * Logs in to Directus if supplied with credentials
     */
    async init() {
        try {
            if (this.email && this.password) {
                await this.client.login({
                    email: this.email,
                    password: this.password,
                });
            }
        } catch (e) {
            error(`Error logging in to Directus: ${e}`);
        }
    }

    /**
     * Fetch all Collections from Directus excluding system
     * collections (ie. those prefixed with "directus_")
     */
    async getAllCollections() {
        try {
            const collectionsData = await this.client.getCollections();
            // Directus API doesn't support filtering collections on requests
            // so this will do
            const collections = collectionsData.data.filter(
                collection => !collection.collection.startsWith('directus_'),
            );
            return collections;
        } catch (e) {
            console.error(`Error fetching Collections: ${e}`);
            return [];
        }
    }

    /**
     * Fetch all items for all Collections described in function
     * parameter. Returns an object with each Collection name as
     * key and list of Collection Items as values.
     */
    async getAllEntities(collections) {
        const entities = {};
        await Promise.all(
            collections.map(async collection => {
                const collectionName = collection.collection;
                try {
                    const items = await this.getItemsForCollection(collectionName);
                    entities[collectionName] = items;
                } catch (e) {
                    error(`Error fetching entities for Collection ${collectionName}: ${e}`);
                }
            }),
        );
        return entities;
    }

    /**
     * Fetch all Relations from Directus excluding system
     * relations (ie. those prefixed with "directus_")
     */
    async getAllRelations() {
        try {
            const relationsData = await this.client.getRelations({
                filter: { collection_many: { nlike: 'directus_' } },
            });
            return relationsData.data;
        } catch (e) {
            error(`Error fetching Relations: ${e}`);
            return [];
        }
    }

    /**
     * Fetch all Items in a collection
     */
    async getItemsForCollection(collectionName) {
        try {
            const itemsData = await this.client.getItems(collectionName);
            return itemsData.data;
        } catch (e) {
            error(`Error while fetching collection ${collectionName}: ${e}`);
            return [];
        }
    }

    /**
     * Fetch all files from Directus
     */
    async getAllFiles() {
        try {
            // Directus SDK doesn't yet support fetching files via a
            // dedicated method yet but this works just as well
            const filesData = await this.client.get('files');
            return filesData.data;
        } catch (e) {
            error(`gatsby-source-directus: Error while fetching files: ${e}`);
            return [];
        }
    }
}
