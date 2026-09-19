/**
 * @file Tiger grammar for tree-sitter
 * @author Pusen Yi
 * @license LGPL-3.0-or-later
 */

/// <reference path="./types/dsl.d.ts" />
// @ts-check

export default grammar({
  name: "tiger",

  externals: $ => [
    $.comment_block,
  ],

  conflicts: $ => [
    [$.type_id, $.lvalue], // type_id is using the same pattern as lvalue
  ],

  extras: ($) => [
    /\s/, // whitespace
    $.comment
  ],

  word: $ => $.identifier,

  rules: {
    // TODO: add the actual grammar rules
    // a source_file is just an expression
    source_file: $ => $._expression,

    comment: $ => seq("/*", optional($.comment_block), "*/"),

    identifier: _ => /[a-zA-Z][a-zA-Z0-9_]*/,
    type_id: $ => $.identifier, // what is the actual type_id naming requirements?
    int_literal: _ => /[0-9]+/,
    string_literal: _ => token(seq(
      '"',
      repeat(choice(
        /[^"\\]/,
        /\\[nt"\\]/,
        /\\[0-9]{3}/,
        /\\\^[@A-Z\[\\\]\^_]/,
        /\\[ \t\n\r\f]+\\/,
      )),
      '"',
    )),

    declaration: $ => repeat1(choice($.variable_dec, $.function_dec, $.type_dec)),

    variable_dec: $ => seq("var", $.identifier,
      optional(seq(":", $.type_id)), ":=", $._expression
    ),

    function_dec: $ => seq(
      "function", $.identifier, "(", optional($.type_fields), ")",
      optional(seq(":", $.type_id)), "=", $._expression
    ),

    type_dec: $ => seq("type", $.type_id, "=", $.type),

    type: $ => choice(
      $.type_id,
      seq("{", "}"),
      seq("{", $.type_fields, "}"),
      seq("array", "of", $.type_id),
    ),

    type_fields: $ => seq(
      $.identifier, ":", $.type_id,
      repeat(seq(",", $.identifier, ":", $.type_id)),
    ),

    // in the appendix of Appel's compiler book it requires some typed expr but
    // in the tree-sitter
    _expression: $ => choice(
      $.lvalue,
      $.assignment,
      $.record,
      $.function_call,
      // if cases
      $.if_expr,
      // while cases
      $.while_expr,
      // for cases
      $.for_expr,
      // let in end cases
      $.let_expr,
      "break", // break should only be used in for or while loop
      "nil",
      seq("(", $._expression, repeat1(seq(";", $._expression)), ")"),
      $.int_literal,
      $.string_literal,
      // negation is more like a unary operation, has hight precedence
      prec(7, seq("-", $._expression)),
      $.arithmetic_expr,
      $.compare_expr,
      $.boolean_expr,
      $.array_expr,
      seq("(", optional($._expression), ")"),
    ),

    lvalue: $ => choice(
      $.identifier,
      seq($.lvalue, ".", $.identifier),
      seq($.lvalue, "[", $._expression, "]"),
    ),

    assignment: $ => prec(1, seq($.lvalue, ":=", $._expression)),

    record: $ => choice(
      seq($.type_id, "{", "}"),
      seq($.type_id, "{",
        $.identifier, "=", $._expression,
        repeat(seq(",", $.identifier, "=", $._expression)),
        "}"
      )
    ),

    function_call: $ => choice(
      seq($.identifier, "(", ")"),
      seq($.identifier, "(",
          $._expression, repeat(seq(",", $._expression)),
        ")"),
    ),

    if_expr: $ => choice(
      prec.right(seq("if", $._expression, "then", $._expression)),
      prec.right(
        seq("if", $._expression, "then", $._expression, "else", $._expression)
      ),
    ),

    while_expr: $ => seq("while", $._expression, "do", $._expression),

    for_expr: $ => seq(
      "for", $.identifier, ":=", $._expression, "to", $._expression, "do",
      $._expression
    ),

    let_expr: $ => choice(
      seq("let", optional($.declaration), "in", "end"),
      seq("let", optional($.declaration), "in", $._expression, "end"),
      seq("let", optional($.declaration), "in",
        seq($._expression, repeat1(seq(";", $._expression))),
        "end"),
    ),

    // apply to int type expr
    arithmetic_expr: $ => choice(
      prec.left(6, seq($._expression, "*", $._expression)),
      prec.left(6, seq($._expression, "/", $._expression)),
      prec.left(5, seq($._expression, "+", $._expression)),
      prec.left(5, seq($._expression, "-", $._expression)),
    ),

    // apply to int and string type expr
    // tree-sitter cannot use nonassoc to limit the assocativity for comparsion
    // this is not expressive enough.
    compare_expr: $ => choice(
      prec.left(4, seq($._expression, "=", $._expression)),
      prec.left(4, seq($._expression, "<>", $._expression)),
      prec.left(4, seq($._expression, ">", $._expression)),
      prec.left(4, seq($._expression, "<", $._expression)),
      prec.left(4, seq($._expression, ">=", $._expression)),
      prec.left(4, seq($._expression, "<=", $._expression)),
    ),

    boolean_expr: $ => choice(
      prec.left(3, seq($._expression, "&", $._expression)),
      prec.left(2, seq($._expression, "|", $._expression)),
    ),

    array_expr: $ => seq($.type_id, "[", $._expression, "]", "of", $._expression),
  }
});
