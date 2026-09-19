// SPDX-License-Identifier: LGPL-3.0-or-later
#include "tree_sitter/parser.h"

enum TokenType { COMMENT_BLOCK };

static inline bool process_comment(TSLexer *);

void * tree_sitter_tiger_external_scanner_create() {
  return NULL;
}

void tree_sitter_tiger_external_scanner_destroy(void *payload) {
}

unsigned tree_sitter_tiger_external_scanner_serialize(
  void *payload,
  char *buffer
) {
  return 0;
}

void tree_sitter_tiger_external_scanner_deserialize(
  void *payload,
  const char *buffer,
  unsigned length
) {
}

bool tree_sitter_tiger_external_scanner_scan(
  void *payload,
  TSLexer *lexer,
  const bool *valid_symbols
) {
  if (!lexer->eof(lexer) && valid_symbols[COMMENT_BLOCK])
    return process_comment(lexer);

  return false;
}

static inline bool process_comment(TSLexer *lexer) {
  unsigned int comment_depth = 1;

  // design a two char sliding window to detect nested comment depth
  enum CommentChar { NORMAL, SLASH, STAR };
  // match the 2 character first and second as "/*" or "*/"
  enum CommentChar first;
  enum CommentChar second;

  switch (lexer->lookahead) {
  case '/':
    first = SLASH;
    break;
  case '*':
    first = STAR;
    break;

  default:
    first = NORMAL;
    break;
  }

  lexer->advance(lexer, false);

  switch (lexer->lookahead) {
  case '/':
    second = SLASH;
    break;
  case '*':
    second = STAR;
    break;
  default:
    second = NORMAL;
    break;
  }

  // test if first two are "*/", the eof just check the position and advance
  // will change nothing if it meets eof
  if (first == STAR && second == SLASH) {
    return false;
  }

  while (comment_depth != 0 && !lexer->eof(lexer)) {
    // now handle first
    switch (first) {
    case SLASH:
      if (second == STAR) {
        comment_depth += 1;
        second = NORMAL;
      }
      break;
    case STAR:
      if (second == SLASH) {
        comment_depth -= 1;
        second = NORMAL;
      } else {
        // not a "*/" case, mark the end
        lexer->mark_end(lexer);
      }
      break;
    case NORMAL:
      // normal, mark the end early
      lexer->mark_end(lexer);
    }

    lexer->advance(lexer, false);
    // mark the end for "/?" after comment_depth finished checking. for the "*/"
    // case, let the next non closing token handle that. (Therefore the last
    // "*/" is not marked as end
    if (first == SLASH && comment_depth != 0) {
      lexer->mark_end(lexer);
    }
    first = second;

    if (lexer->lookahead == '/') {
      second = SLASH;
    } else if (lexer->lookahead == '*') {
      second = STAR;
    } else {
      second = NORMAL;
    }
  }

  // handle the case when eof and not closing comment, mark to the end to get
  // all token
  if (lexer->eof(lexer) && comment_depth != 0){
    lexer->mark_end(lexer);
  }

  lexer->result_symbol = COMMENT_BLOCK;
  return true;
}
