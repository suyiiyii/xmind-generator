import { uuid } from './common'
import { Relationship } from './model/relationship'
import { Sheet } from './model/sheet'
import { Summary } from './model/summary'
import { Topic, TopicImageData } from './model/topic'
import { Workbook } from './model/workbook'

type JSONValue = string | number | boolean | JSONObject | Array<JSONValue>

type JSONObject = { [x: string]: JSONValue }

export interface SerializedObject {
  [x: string]: JSONValue
}

export function asJSONObject(whatever: unknown): JSONObject {
  if (typeof whatever === 'object' && whatever !== null && !Array.isArray(whatever)) {
    return whatever as JSONObject
  }
  throw new Error(`Not a JSON object: ${JSON.stringify(whatever)}`)
}

export function asJSONArray(whatever: unknown): Array<JSONValue> {
  if (Array.isArray(whatever)) {
    return whatever as Array<JSONValue>
  }
  throw new Error(`Not a JSON array: ${JSON.stringify(whatever)}`)
}

const resourceIdPrefix = 'xap:resources/'

export function serializeWorkbook(
  workbook: Workbook,
  imageResourceSetter: (imageData: TopicImageData) => string | null
): ReadonlyArray<SerializedObject> {
  return workbook.sheets.map(sheet => serializeSheet(sheet, imageResourceSetter))
}

export function serializeSheet(
  sheet: Sheet,
  imageResourceSetter: (imageData: TopicImageData) => string | null
): Readonly<SerializedObject> {
  const obj: SerializedObject = {
    id: sheet.id,
    class: 'sheet',
    title: sheet.title ?? ''
  }
  if (sheet.rootTopic) {
    obj.rootTopic = serializeTopic(sheet.rootTopic, imageResourceSetter)
  }
  if (sheet.relationships.length > 0) {
    obj.relationships = sheet.relationships.map(relationship => serializeRelationship(relationship))
  }
  return obj
}

export function serializeTopic(
  topic: Topic | Readonly<Topic>,
  imageResourceSetter: (imageData: TopicImageData) => string | null
): Readonly<SerializedObject> {
  const obj: SerializedObject = {
    id: topic.id,
    class: 'topic',
    title: topic.title ?? '',
    children: { attached: [], summary: [] },
    summaries: []
  }
  const { note, labels, image, markers, summaries } = topic

  if (note) {
    obj.notes = {
      plain: { content: note + '\n' }
    }
  }

  obj.labels = labels as string[]

  if (topic.children.length > 0) {
    obj.children = {
      attached: topic.children.map(child => serializeTopic(child, imageResourceSetter))
    }
  }

  if (image) {
    const resourcePath = imageResourceSetter(image)
    if (resourcePath) {
      obj.image = {
        src: resourceIdPrefix + resourcePath
      }
    }
  }

  obj.markers = markers.length > 0 ? markers.map(marker => ({ markerId: marker.id })) : []

  if (summaries.length > 0) {
    const summaryTopics: Array<JSONObject> = []
    summaries.forEach(summary => {
      const serializedSummary = serializeSummary(topic, summary)
      if (serializedSummary) {
        const topicId = uuid()
        obj.summaries = [
          ...asJSONArray(obj.summaries),
          asJSONObject({ ...serializedSummary, topicId })
        ]
        summaryTopics.push(asJSONObject({ id: topicId, class: 'topic', title: summary.title }))
      }
    })
    obj.children = { ...asJSONObject(obj.children), summary: summaryTopics }
  }

  return obj
}

export function serializeRelationship(relationship: Relationship): Readonly<SerializedObject> {
  return {
    id: relationship.id,
    class: 'relationship',
    end1Id: relationship.fromTopicId,
    end2Id: relationship.toTopicId,
    title: relationship.title ?? ''
  }
}

export function serializeSummary(
  topic: Readonly<Topic>,
  summary: Summary
): Readonly<SerializedObject> | null {
  const { id, startTopicId, endTopicId } = summary
  const rangeStart = topic.children.findIndex(child => child.query(startTopicId))
  const rangeEnd = topic.children.findIndex(child => child.query(endTopicId))
  if (rangeStart < 0 || rangeEnd < 0) {
    return null
  }
  const range = [rangeStart, rangeEnd].sort()
  return {
    id,
    class: 'summary',
    range: `(${range.join(',')})`
  }
}