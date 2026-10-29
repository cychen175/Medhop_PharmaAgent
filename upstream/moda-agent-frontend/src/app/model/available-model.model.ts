export class AvailableModel {
  modelPath: string;
  modelName: string;
  description: string;
  url: string;
  imagesSupport: number;
  reasoning: boolean;
  maxTokens: number;

  constructor() {
    this.modelPath = '';
    this.modelName = '';
    this.description = '';
    this.url = '';
    this.imagesSupport = 0;
    this.reasoning = false;
    this.maxTokens = 0;
  }
}
