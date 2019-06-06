import { prepareNodes, prepareFileNodes, mapRelations } from '../src/process';

describe('prepareNodes', () => {
    test('generates proper replacement IDs', () => {
        const data = {
            books: [
                { name: 'Cool beans', author: 'Smart fellow' },
                { name: 'Ducktales', author: 'Real human Being' },
            ],
        };

        prepareNodes(data).books.map(book => expect(book.id).toBe(`Directus__Book__${book.name}`));
    });
});

describe('prepareFileNodes', () => {
    test('generates file nodes properly', () => {
        const data = [{ id: 1, fileName: 'Funny picture' }, { id: 2, fileName: 'Best song' }];

        prepareFileNodes(data).map((file, i) => expect(file.id).toBe(`Directus__File__${i + 1}`));
    });
});

describe('mapRelations', () => {
    const entityData = {
        movies: [
            { id: 0, directusId: 0, name: 'Titanic', director: 0 },
            { id: 1, directusId: 1, name: 'Romeo & Juliet', director: 1 },
            { id: 2, directusId: 2, name: 'Bambi', director: 1 },
            { id: 4, directusId: 4, name: 'Wall-E', director: 0 },
        ],
        directors: [
            { id: 0, directusId: 0, name: 'John Smith' },
            { id: 1, directusId: 1, name: 'Mary Sue' },
        ],
    };
    const expected = {
        movies: [
            {
                id: 0,
                directusId: 0,
                name: 'Titanic',
                director___NODE: 0,
            },
            {
                id: 1,
                directusId: 1,
                name: 'Romeo & Juliet',
                director___NODE: 1,
            },
            {
                id: 2,
                directusId: 2,
                name: 'Bambi',
                director___NODE: 1,
            },
            {
                id: 4,
                directusId: 4,
                name: 'Wall-E',
                director___NODE: 0,
            },
        ],
        directors: [
            {
                id: 0,
                directusId: 0,
                name: 'John Smith',
                movies___NODE: [0, 4],
            },
            {
                id: 1,
                directusId: 1,
                name: 'Mary Sue',
                movies___NODE: [1, 2],
            },
        ],
    };

    test('handles many-to-one properly', () => {
        const relationData = [
            {
                collection_many: 'movies',
                field_many: 'director',
                collection_one: 'directors',
                field_one: null,
                junction_field: null,
            },
        ];

        const originalLog = console.log;
        console.log = jest.fn();
        const mappedEntities = mapRelations(entityData, relationData, []);
        console.log = originalLog;

        expect(mappedEntities).toStrictEqual(expected);
    });

    test('handles one-to-many properly', () => {
        const relationData = [
            {
                collection_many: 'movies',
                field_many: 'director',
                collection_one: 'directors',
                field_one: 'movies',
                junction_field: null,
            },
        ];

        const originalLog = console.log;
        console.log = jest.fn();
        const mappedEntities = mapRelations(entityData, relationData, []);
        console.log = originalLog;

        expect(mappedEntities).toStrictEqual(expected);
    });
});
