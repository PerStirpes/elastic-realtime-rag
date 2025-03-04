/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *	http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Semantic-conventions constants.
 *
 * This instrumentation uses unstable semconv:
 *    https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md#unstable-semconv
 * OTel JS advice is to *copy* relevant definitions, rather than take a
 * dependency on `@opentelemetry/semantic-conventions` and use its
 * `.../incubating` entry-point.
 *
 * There are a small number of stable semconv definitions used, so the main
 * entry-point *could* be used. However, for now we opt to copy those
 * definitions as well.
 */

// -- Stable semconv

export const ATTR_SERVER_ADDRESS = "server.address"
export const ATTR_SERVER_PORT = "server.port"

// -- Unstable semconv

export const ATTR_EVENT_NAME = "event.name"
export const ATTR_GEN_AI_OPERATION_NAME = "gen_ai.operation.name"
export const ATTR_GEN_AI_REQUEST_FREQUENCY_PENALTY = "gen_ai.request.frequency_penalty"
export const ATTR_GEN_AI_REQUEST_MAX_TOKENS = "gen_ai.request.max_tokens"
export const ATTR_GEN_AI_REQUEST_MODEL = "gen_ai.request.model"
export const ATTR_GEN_AI_REQUEST_PRESENCE_PENALTY = "gen_ai.request.presence_penalty"
export const ATTR_GEN_AI_REQUEST_TOP_P = "gen_ai.request.top_p"
export const ATTR_GEN_AI_RESPONSE_FINISH_REASONS = "gen_ai.response.finish_reasons"
export const ATTR_GEN_AI_RESPONSE_ID = "gen_ai.response.id"
export const ATTR_GEN_AI_RESPONSE_MODEL = "gen_ai.response.model"
export const ATTR_GEN_AI_RESPONSE_STATUS = "gen_ai.response.status"
export const ATTR_GEN_AI_SYSTEM = "gen_ai.system"
export const ATTR_GEN_AI_TOKEN_TYPE = "gen_ai.token.type"
export const ATTR_GEN_AI_USAGE_INPUT_TOKENS = "gen_ai.usage.input_tokens"
export const ATTR_GEN_AI_USAGE_OUTPUT_TOKENS = "gen_ai.usage.output_tokens"
export const METRIC_GEN_AI_CLIENT_OPERATION_DURATION = "gen_ai.client.operation.duration"
export const METRIC_GEN_AI_CLIENT_TOKEN_USAGE = "gen_ai.client.token.usage"

export const ATTR_GEN_AI_REQUEST_ENCODING_FORMATS = "gen_ai.request.encoding_formats"

// The JS semconv package doesn't yet emit constants for event names.
// TODO: otel-js issue for semconv pkg not including event names
export const EVENT_GEN_AI_SYSTEM_MESSAGE = "gen_ai.system.message"
export const EVENT_GEN_AI_USER_MESSAGE = "gen_ai.user.message"
export const EVENT_GEN_AI_ASSISTANT_MESSAGE = "gen_ai.assistant.message"
export const EVENT_GEN_AI_TOOL_MESSAGE = "gen_ai.tool.message"
export const EVENT_GEN_AI_CHOICE = "gen_ai.choice"

// -- Additional attributes for realtime instrumentation

// Tool-related attributes
export const ATTR_GEN_AI_TOOL_NAME = "gen_ai.tool.name"
export const ATTR_GEN_AI_TOOL_CALLED = "gen_ai.tool.called"
export const ATTR_GEN_AI_TOOL_SUCCESS = "gen_ai.tool.success"
export const ATTR_GEN_AI_TOOL_ERROR = "gen_ai.tool.error"
export const ATTR_GEN_AI_TOOL_RESULT_COUNT = "gen_ai.tool.result_count"
export const ATTR_GEN_AI_TOOL_ARGUMENT_COUNT = "gen_ai.tool.argument_count"
export const ATTR_GEN_AI_TOOL_ARGUMENT_TYPES = "gen_ai.tool.argument_types"

// Event-related attributes
export const ATTR_GEN_AI_EVENT_TYPE = "gen_ai.event.type"
export const ATTR_GEN_AI_EVENT_PAYLOAD_SIZE = "gen_ai.event.payload_size"
export const ATTR_GEN_AI_EVENT_NAME_SUFFIX = "gen_ai.event.name_suffix"
export const ATTR_GEN_AI_EVENT_ID = "gen_ai.event.id"

// Additional token usage attributes
export const ATTR_GEN_AI_TOTAL_TOKENS = "gen_ai.usage.total_tokens"
export const ATTR_GEN_AI_INPUT_TEXT_TOKENS = "gen_ai.usage.input_text_tokens"
export const ATTR_GEN_AI_INPUT_AUDIO_TOKENS = "gen_ai.usage.input_audio_tokens"
export const ATTR_GEN_AI_OUTPUT_TEXT_TOKENS = "gen_ai.usage.output_text_tokens"
export const ATTR_GEN_AI_OUTPUT_AUDIO_TOKENS = "gen_ai.usage.output_audio_tokens"
export const ATTR_GEN_AI_CACHED_TOKENS = "gen_ai.usage.cached_tokens"
export const ATTR_GEN_AI_CACHED_TEXT_TOKENS = "gen_ai.usage.cached_text_tokens"
export const ATTR_GEN_AI_CACHED_AUDIO_TOKENS = "gen_ai.usage.cached_audio_tokens"

// Conversation attributes
export const ATTR_GEN_AI_CONVERSATION_ID = "gen_ai.conversation.id"

// Voice and audio attributes
export const ATTR_GEN_AI_VOICE = "gen_ai.voice"
export const ATTR_GEN_AI_OUTPUT_AUDIO_FORMAT = "gen_ai.output_audio_format"
export const ATTR_GEN_AI_HAS_AUDIO_CONTENT = "gen_ai.has_audio_content"
export const ATTR_GEN_AI_CONTENT_TYPES = "gen_ai.content_types"

// Temperature and generation parameters
export const ATTR_GEN_AI_TEMPERATURE = "gen_ai.temperature"
export const ATTR_GEN_AI_MAX_OUTPUT_TOKENS = "gen_ai.max_output_tokens"
export const ATTR_GEN_AI_MODALITIES = "gen_ai.modalities"

// Output item attributes
export const ATTR_GEN_AI_OUTPUT_ITEM_ID = "gen_ai.output.item.id"
export const ATTR_GEN_AI_OUTPUT_ITEM_TYPE = "gen_ai.output.item.type"
export const ATTR_GEN_AI_OUTPUT_ITEM_STATUS = "gen_ai.output.item.status"
export const ATTR_GEN_AI_OUTPUT_ITEM_ROLE = "gen_ai.output.item.role"

// Transcript attributes
export const ATTR_GEN_AI_HAS_TRANSCRIPT = "gen_ai.has_transcript"
export const ATTR_GEN_AI_TRANSCRIPT_LENGTH = "gen_ai.transcript.length"
export const ATTR_GEN_AI_TRANSCRIPT_PREVIEW = "gen_ai.transcript.preview"
export const ATTR_GEN_AI_TRANSCRIPT_FULL = "gen_ai.transcript.full"
export const ATTR_GEN_AI_TRANSCRIPT_TIMESTAMP = "gen_ai.transcript.timestamp"
export const ATTR_GEN_AI_TRANSCRIPT_SOURCE = "gen_ai.transcript.source"
export const ATTR_GEN_AI_TRANSCRIPT_ROLE = "gen_ai.transcript.role"
export const ATTR_GEN_AI_CONTENT_INDEX = "gen_ai.content.index"
export const ATTR_GEN_AI_ITEM_ID = "gen_ai.item.id"
