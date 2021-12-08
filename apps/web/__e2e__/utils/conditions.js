/* eslint-disable no-undef */

const { expect } = require("@playwright/test");
const { getTestId, NOTE } = require(".");
const List = require("./listitemidbuilder");

async function isPresent(selector) {
  try {
    await page.waitForSelector(selector, { state: "attached", timeout: 10000 });
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

async function isAbsent(selector) {
  try {
    await page.waitForSelector(selector, { state: "detached", timeout: 10000 });
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

async function isToastPresent() {
  return isPresent(getTestId("toast"));
}

async function checkNotePresence(viewId, index = 0, note = NOTE) {
  let noteSelector = List.new("note").view(viewId).grouped().atIndex(index);
  // noteSelector = noteSelector.build();

  await page.waitForSelector(noteSelector.build(), { state: "attached" });

  await (await page.$(noteSelector.build())).scrollIntoViewIfNeeded();

  await expect(page.innerText(noteSelector.title().build())).resolves.toBe(
    note.title
  );
  return noteSelector.build();
}

module.exports = { isPresent, isAbsent, isToastPresent, checkNotePresence };
