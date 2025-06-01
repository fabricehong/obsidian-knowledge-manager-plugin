// Service singleton pour référencer des objets volumineux par ID
// Utilisé par les tools et le chat panel pour stocker/récupérer des objets via un identifiant

export class ObjectReferenceService {
  private static instance: ObjectReferenceService;
  private store: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): ObjectReferenceService {
    if (!ObjectReferenceService.instance) {
      ObjectReferenceService.instance = new ObjectReferenceService();
    }
    return ObjectReferenceService.instance;
  }

  registerObject(id: string, data: any): void {
    this.store.set(id, data);
  }

  getObject(id: string): any | undefined {
    return this.store.get(id);
  }

  clearAll(): void {
    this.store.clear();
  }
}

// Utilisation :
// const refService = ObjectReferenceService.getInstance();
// refService.registerObject('id', obj);
// const obj = refService.getObject('id');
// refService.clearAll();
