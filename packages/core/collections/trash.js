import Collection from "./collection";
import getId from "../utils/id";
import { get7DayTimestamp } from "../utils/date";

export default class Trash extends Collection {
  async init() {
    await this.cleanup();
  }

  async cleanup() {
    const sevenDayPreviousTimestamp = Date.now() - get7DayTimestamp();
    this.all.forEach(async (item) => {
      if (item.dateDeleted < sevenDayPreviousTimestamp) {
        await this.delete(item.id);
      }
    });
  }

  get raw() {
    return this._collection.getRaw();
  }

  get all() {
    return this._collection.getItems((u) => u.dateDeleted);
  }

  async add(item) {
    if (item.dateDeleted || item.deleted) {
      return await this._collection.addItem(item);
    }
    await this._collection.addItem({
      ...item,
      type: "trash",
      itemType: item.type,
      id: getId(),
      itemId: item.id,
      dateDeleted: Date.now(),
    });
  }

  async delete(...ids) {
    for (let id of ids) {
      if (!id) continue;
      let item = this._collection.getItem(id);
      if (!item) continue;
      if (item.itemType === "note") {
        await this._db.content.remove(item.contentId);
      }
      await this._collection.removeItem(id);
    }
  }

  async restore(...ids) {
    for (let id of ids) {
      let item = { ...this._collection.getItem(id) };
      if (!item) continue;
      delete item.dateDeleted;
      delete item.id;
      item.id = item.itemId;
      item.type = item.itemType;
      delete item.itemType;
      delete item.itemId;
      if (item.type === "note") {
        let { notebook } = item;
        item.notebook = {};
        await this._db.notes.add(item);

        if (notebook && notebook.id && notebook.topic) {
          const { id, topic } = notebook;

          // if the notebook or topic has been deleted
          if (
            !this._db.notebooks._collection.exists(id) ||
            !this._db.notebooks.notebook(id).topics.has(topic)
          ) {
            notebook = {};
          }

          // restore the note to the topic it was in before deletion
          if (notebook.id && notebook.topic) {
            await this._db.notebooks
              .notebook(id)
              .topics.topic(topic)
              .add(item.id);
          }
        }
      } else if (item.type === "notebook") {
        const { topics } = item;
        item.topics = [];
        await this._db.notebooks.add(item);
        let notebook = this._db.notebooks.notebook(item.id);
        for (let topic of topics) {
          await notebook.topics.add(topic.title);
          let t = notebook.topics.topic(topic.title);
          if (!t) continue;
          if (topic.notes) await t.add(...topic.notes);
        }
      }
      await this._collection.removeItem(id);
    }
  }

  async clear() {
    let indices = await this._collection.indexer.getIndices();
    return this.delete(...indices);
  }
}
