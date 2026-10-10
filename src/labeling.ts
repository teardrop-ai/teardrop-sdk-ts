import type { HttpTransport } from "./transport";
import type {
  LabelingBindingRequest,
  LabelingBindingResponse,
  LabelingDefinitionItem,
  LabelingOverrideResponse,
  LabelingPredictionItem,
  PredictionProofResponse,
  PredictionSubmitRequest,
  PredictionSubmitResponse,
  LabelingResultItem,
  ScoreResult,
} from "./types";
import { parseListResponse } from "./utils/parseListResponse";

export class LabelingModule {
  constructor(private readonly http: HttpTransport) {}

  async listDefinitions(): Promise<LabelingDefinitionItem[]> {
    const data = await this.http.request<unknown>("GET", "/labeling/definitions");
    const parsed = parseListResponse<LabelingDefinitionItem>(data, {
      container: "items",
    });
    return parsed.items;
  }

  async listPredictions(params?: { limit?: number }): Promise<LabelingPredictionItem[]> {
    const data = await this.http.request<unknown>("GET", "/labeling/predictions", {
      params: { limit: params?.limit },
    });
    const parsed = parseListResponse<LabelingPredictionItem>(data, {
      container: "items",
    });
    return parsed.items;
  }

  async getPredictionProof(
    predictionId: string,
  ): Promise<PredictionProofResponse> {
    return this.http.request<PredictionProofResponse>(
      "GET",
      `/labeling/predictions/${encodeURIComponent(predictionId)}/proof`,
    );
  }

  async submitPrediction(
    data: PredictionSubmitRequest,
  ): Promise<PredictionSubmitResponse> {
    return this.http.request<PredictionSubmitResponse>(
      "POST",
      "/labeling/predictions",
      { body: data },
    );
  }

  async listResults(params?: { limit?: number }): Promise<LabelingResultItem[]> {
    const data = await this.http.request<unknown>("GET", "/labeling/results", {
      params: { limit: params?.limit },
    });
    const parsed = parseListResponse<LabelingResultItem>(data, {
      container: "items",
    });
    return parsed.items;
  }

  async bind(data: LabelingBindingRequest): Promise<LabelingBindingResponse> {
    return this.http.request<LabelingBindingResponse>("POST", "/labeling/bindings", {
      body: data,
    });
  }

  async override(
    targetId: string,
    data: ScoreResult,
  ): Promise<LabelingOverrideResponse> {
    return this.http.request<LabelingOverrideResponse>(
      "POST",
      `/labeling/results/${encodeURIComponent(targetId)}/override`,
      { body: data },
    );
  }
}
