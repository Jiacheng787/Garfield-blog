// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Garfield\'s Blog',
  tagline: 'Dinosaurs are cool',
  url: 'https://your-docusaurus-test-site.com',
  baseUrl: '/Garfield-blog/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'facebook', // Usually your GitHub org/user name.
  projectName: 'docusaurus', // Usually your repo name.

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: false,
        blog: {
          routeBasePath: '/', // Serve the blog at the site's root
          showReadingTime: true,
          // Please change this to your repo.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
          blogSidebarCount: 'ALL',
          blogSidebarTitle: 'All our posts',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Garfield\'s Blog',
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo.svg',
        },
        items: [
          {to: '/about-me', label: 'About Me', position: 'right'},
          {
            href: 'https://github.com/Jiacheng787/Garfield-blog',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Blog',
            items: [
              {
                label: 'Tutorial',
                to: '/blog',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Garfield-cli 前端工程化',
                href: 'https://github.com/garfield-dev-team/Garfield-cli',
              },
              {
                label: 'NPM 工程化规范',
                href: 'https://github.com/Jiacheng787/Garfield-utils',
              },
              {
                label: 'React 从零到一工程化指北',
                href: 'https://github.com/Jiacheng787/React-zero-to-one',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Golang 学习',
                href: 'https://github.com/Jiacheng787/go-by-example',
              },
              {
                label: '面试内容汇总',
                href: 'https://github.com/Jiacheng787/Bytedance-interview',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
