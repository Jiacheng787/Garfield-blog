import logger from "@docusaurus/logger";
import { prompt } from "enquirer";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const workDir = process.cwd();
const blogDir = path.resolve(workDir, "blog");

function prefix(num: number): string {
  return `${num}`.padStart(2, "0");
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const date = d.getDate();

  return [
    year,
    prefix(month),
    prefix(date)
  ].join("-");
}

function formatTime(d: Date): string {
  const hours = d.getHours();
  const minutes = d.getMinutes();

  return `T${prefix(hours)}:${prefix(minutes)}`;
}

function getDateTime(): string[] {
  const d = new Date();
  const dateTime = formatDate(d);
  const specTime = formatTime(d);
  return [dateTime, specTime];
}

async function isDirExists(path: string): Promise<boolean> {
  try {
    const stats = await fs.stat(path);
    if (!stats.isDirectory()) {
      throw new Error();
    }
    // 已存在博客目录
    return true;
  } catch (error) {
    // 路径不存在或者不是目录
    return false;
  }
}

async function main() {
  const { title } = await prompt<{ title: string }>({
    type: 'input',
    name: 'title',
    message: 'Input blog title',
  });

  const { description } = await prompt<{ description: string }>({
    type: 'input',
    name: 'description',
    message: 'Input blog description',
    initial: 'This is my first post on Docusaurus 2.'
  });

  const { yes } = await prompt<{ yes: boolean }>({
    type: 'confirm',
    name: 'yes',
    message: `Create new blog ${title}. Confirm?`
  })

  if (!yes) {
    return
  }

  const slug = title.toLowerCase().replace(/\s/g, "-");

  const [dateTime, specTime] = getDateTime();
  const folderName = dateTime;

  const template = [
    "---",
    `slug: ${slug}`,
    `title: ${title}`,
    `date: ${dateTime + specTime}`,
    `description: ${description}`,
    "authors: [garfield]",
    "tags: []",
    "---",
    "",
    "<!--truncate-->",
    "",
    "",
  ].join(os.EOL);

  const newDir = path.resolve(blogDir, folderName);
  const newFile = path.resolve(blogDir, folderName, `${slug}.md`);

  if (!await isDirExists(newDir)) {
    logger.info("Create new dir...");
    await fs.mkdir(newDir);
  }

  logger.info("Init file content...");
  await fs.writeFile(newFile, template);

  logger.success("Successfully create new blog!");
}

main().catch(err => {
  logger.error(err);
})
