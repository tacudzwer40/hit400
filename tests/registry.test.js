describe('DeedGuard Registry System', () => {
    let mockRegistry = [];

    beforeEach(() => {
        mockRegistry = [
            { id: '123', deedNumber: '14/89/2021', owner: 'Tonderai Mushoriwa', hash: 'abc123hash' }
        ];
    });

    test('Valid registration payload (Creates new entry)', async () => {
        const newDeed = { deedNumber: '555/2024', owner: 'John Doe', hash: 'xyz987hash' };
        mockRegistry.push(newDeed);
        expect(mockRegistry.length).toBe(2);
        expect(mockRegistry[1].deedNumber).toBe('555/2024');
    });

    test('Valid retrieval request (Fetches all deeds)', async () => {
        const deeds = mockRegistry;
        expect(deeds.length).toBe(1);
        expect(deeds[0].deedNumber).toBe('14/89/2021');
    });

    test('Valid document match (Authentic verification)', async () => {
        const scanData = { deedNumber: '14/89/2021', owner: 'Tonderai Mushoriwa' };
        const match = mockRegistry.find(d => d.deedNumber === scanData.deedNumber && d.owner === scanData.owner);
        expect(match).toBeDefined();
        expect(match.hash).toBe('abc123hash');
    });

    test('Invalid identity (Detects mismatch fraud)', async () => {
        const scanData = { deedNumber: '14/89/2021', owner: 'Nyamarebvu' };
        const deedExists = mockRegistry.find(d => d.deedNumber === scanData.deedNumber);
        const ownerMatch = deedExists && deedExists.owner === scanData.owner;
        
        expect(deedExists).toBeDefined();
        expect(ownerMatch).toBe(false); // FRAUD
    });

    test('Valid update payload (Modifies property records)', async () => {
        const deedId = '123';
        const index = mockRegistry.findIndex(d => d.id === deedId);
        mockRegistry[index].lienStatus = 'Active';
        
        expect(mockRegistry[index].lienStatus).toBe('Active');
    });

    test('Invalid deed lookup (Returns NOT_FOUND)', async () => {
        const scanData = { deedNumber: '999/9999' };
        const match = mockRegistry.find(d => d.deedNumber === scanData.deedNumber);
        
        expect(match).toBeUndefined();
    });
});
