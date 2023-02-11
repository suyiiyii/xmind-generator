import { Sheet } from '../model/sheet'
import { RelationshipInfo, SheetBuilder, TopicBuilder } from '../../builder'

export function makeSheetBuilder(title?: string): SheetBuilder {
  let rootTopicBuilder: TopicBuilder
  const relationshipInfos: RelationshipInfo[] = []
  return {
    rootTopic(topicBuilder: TopicBuilder) {
      rootTopicBuilder = topicBuilder
      return this
    },
    relationships(relationships: ReadonlyArray<RelationshipInfo>) {
      relationshipInfos.push(...relationships)
      return this
    },
    build() {
      const { topic: rootTopic, reference } = rootTopicBuilder?.build() ?? {}
      const sheet = new Sheet(title, rootTopic)
      relationshipInfos.forEach(({ title, fromRef, toRef }) => {
        sheet.addRelationship(title, reference.fetch(fromRef).id, reference.fetch(toRef).id)
      })
      return sheet
    }
  }
}