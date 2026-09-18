#include "tree_sitter/parser.h"

enum TokenType { COMMENT, STRING_LITERAL };

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
  int comment_depth = 0;

  if (!valid_symbols[COMMENT])
    return false;

  while (lexer->lookahead == ' ' || lexer->lookahead == '\t' ||
         lexer->lookahead == '\n' || lexer->lookahead == '\r') {
    lexer->advance(lexer, true);
  }

  if (lexer->lookahead == '/' && valid_symbols[COMMENT]) {
    lexer->advance(lexer, false);
    if (lexer->lookahead == '*') {
      comment_depth += 1;
      goto comment;
    } else {
      return false;
    }
  } else {
    return false;
  }

comment:
  lexer->advance(lexer, false);
  // design a two char sliding window to detect nested comment depth
  enum CommentChar { NORMAL, SLASH, STAR };
  enum CommentChar current = NORMAL;
  enum CommentChar prev = NORMAL;

  while (comment_depth > 0 && !lexer->eof(lexer)) {
    if (lexer->lookahead == '/') {
      current = SLASH;
    } else if (lexer->lookahead == '*') {
      current = STAR;
    } else {
      current = NORMAL;
    }

    // now handle "/*" and "*/"
    if (prev == SLASH && current == STAR) {
      comment_depth += 1;
      // after this matches we need to set the current to NORMAL to avoid
      // matching another '/' like "/*/"
      current = NORMAL;
    } else if (prev == STAR && current == SLASH) {
      comment_depth -= 1;
      current = NORMAL;
    }

    lexer->advance(lexer, false);
    prev = current;
  }

  // handle unclosed comment
  if (lexer->eof(lexer) && comment_depth > 0) {
    return false;
  } else {
    lexer->result_symbol = COMMENT;
    return true;
  }
}
