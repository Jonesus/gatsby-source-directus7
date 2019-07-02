import DirectusSDK from '@directus/sdk-js';
import { info, warn, error } from './process';

/**
 * Class with methods for fetching data from Directus
 * via their JS SDK
 */
export default class DirectusFetcher {
    constructor(url, project, email, password, targetStatus, defaultStatus) {
        this.email = email;
        this.password = password;
        this.targetStatus = targetStatus;
        this.defaultStatus = defaultStatus;
        try {
            this.client = new DirectusSDK({
                url,
                project: project || '_',
            });
        } catch (e) {
            error('Error initializing DirectusFetcher: ', e);
            throw e;
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
            error('Error logging in to Directus: ', e);
            throw e;
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
            console.error('Error fetching Collections: ', e);
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
                    error(`Error fetching entities for Collection ${collectionName}: `, e);
                }
            }, this),
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
            error('Error fetching Relations: ', e);
            return [];
        }
    }

    /**
     * Fetch all Items in a collection
     */
    async getItemsForCollection(collectionName) {
        try {
            const itemsData = await this.client.getItems(collectionName, { limit: '-1' });

            if (!this.targetStatus) {
                return itemsData.data;
            }
            // go through all items in collection to check against target status
            const checkedItems = await Promise.all(
                itemsData.data.map(async item => {
                    if (
                        item.status === this.targetStatus ||
                        (this.defaultStatus ? item.status === this.defaultStatus : false)
                    ) {
                        info(`Status matched for ${collectionName} ${item.id}. Using item`);
                        return item;
                    }
                    info(
                        `Target status not matched for ${collectionName} ${
                            item.id
                        }. Going through revisions`,
                    );
                    // get all revisions
                    const itemRevisions = await this.client.getItemRevisions(
                        collectionName,
                        item.id,
                    );

                    // go through all revisions and get the newest matching the target status
                    const selectedItem = itemRevisions.data.reduce((selected, current) => {
                        if (
                            current.data &&
                            current.data.status === this.targetStatus &&
                            selected.data.modified_on < current.data.modified_on
                        ) {
                            return current;
                        }
                        return selected;
                    }, {});
                    if (
                        selectedItem &&
                        selectedItem.data &&
                        selectedItem.data.status === this.targetStatus
                    ) {
                        // workaround: the number fields in the JSON returned from getItemRevisions are Strings, need to convert
                        Object.keys(selectedItem.data).forEach(field => {
                            const converted = Number(selectedItem.data[field]);
                            if (!Number.isNaN(converted)) {
                                selectedItem.data[field] = converted;
                            }
                        });
                        info(
                            `Revision found that matches target status ${
                                this.targetStatus
                            } in ${collectionName} item ${item.id}`,
                        );
                        return selectedItem.data;
                    }
                    warn(
                        `No item of ${item.id} in ${collectionName} matched target status ${
                            this.targetStatus
                        }. This might lead to unexpected behavior!`,
                    );
                    return false;
                }),
            );

            // remove all items that didn't match the target status
            return checkedItems.filter(item => {
                return item !== false;
            });
        } catch (e) {
            error(`Error while fetching collection ${collectionName}: `, e);
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
            const filesData = await this.client.get('files', { limit: '-1' });
            return filesData.data;
        } catch (e) {
            error('gatsby-source-directus: Error while fetching files: ', e);
            return [];
        }
    }
}
