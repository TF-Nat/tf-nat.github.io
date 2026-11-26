# tf.github.io

내 블로그에 내가 글 쓰는 법~

1. posts/ 폴더에 .md 파일 만들기 (영문소문자, 하이픈만 사용)
   그리고 파일 맨 위에는 설정 블록을 아래처럼 적기. (template.md인가 거기에 있음)
---
title: 글 제목
cat: notes
date: 2026.11.23
summary: 목록에 보일 한 줄 설명
---

여기부터 본문 (소제목은 ## 부터)

2. posts.js에 파일 이름(.md)빼고 추가하기
var MD_POSTS = [
  'blackhat-2025-ecscape',
  'knights-frontier-start'
];
