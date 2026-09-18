/**
 * @file Tiger grammar for tree-sitter
 * @author Pusen Yi
 * @license GPLv3
 */

/// <reference path="./types/dsl.d.ts" />
// @ts-check

export default grammar({
  name: "tiger",

  externals: $ => [
    $.comment,
  ],

  extras: ($) => [
    /\s/, // whitespace
    $.comment,
  ],

  rules: {
    // TODO: add the actual grammar rules
    // a source_file is just an expression
    source_file: $ => $.expression,

    identifier: _ => /[a-zA-Z][a-zA-Z0-9_]*/,
    type_id: _ => /[a-zA-Z_]+/, // what is the actual type_id naming requirements?
    int_literal: _ => /[0-9]+/,
    string_literal: _ => /\"[a-zA-Z]*\"/,

    declaration: $ => repeat1(choice($.variable_dec, $.function_dec, $.type_dec)),

    variable_dec: $ => seq("var", $.identifier, optional(seq(":", $.type_id))),
    function_dec: $ => seq(
      "function", $.identifier, "(", optional($.type_fields), ")",
      optional(seq(":", $.type_id)), "=", $.expression
    ),

    type_dec: $ => seq("type", $.type_id, "=", $.type),

    type: $ => choice(
      $.type_id,
      seq("{", $.type_fields, "}"),
      seq("array", "of", $.type_id),
    ),

    type_fields: $ => seq(
      $.identifier, ":", $.type_id,
      repeat(seq(",", $.identifier, ":", $.type_id)),
    ),
      
    // in the appendix of Appel's compiler book it requires some typed expr but
    // in the tree-sitter
    expression: $ => choice(
      $.lvalue,
      $.function_call,
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
      seq("(", $.expression, repeat1(seq(";", $.expression)), ")"),
      // $.int_literal,
      // $.string_literal,
      // negation is more like a unary operation, has hight precedence
      // prec(7, seq("-", $.expression)),
      // $.arithmetic_expr,
      $.compare_expr,
      // $.boolean_expr,
      $._simple_expression,
      $.array_expr,
      seq("(", $.expression, ")"),
    ),

    lvalue: $ => choice(
      $.identifier,
      seq($.lvalue, ".", $.identifier),
      seq($.lvalue, "[", $.expression, "]"),
    ),

    assignment: $ => prec(1, seq($.lvalue, ":=", $.expression)),

    record: $ => seq($.type_id, "{",
      $.identifier, "=", $.expression,
      repeat(seq(",", $.identifier, "=", $.expression)),
      "}"
    ),
    
    function_call: $ => choice(
      seq($.identifier, "(", ")"),
      seq($.identifier, "(",
          $.expression, repeat(seq(",", $.expression)),
        ")"),
    ),

    if_expr: $ => choice(
      prec.right(seq("if", $.expression, "then", $.expression)),
      prec.right(
        seq("if", $.expression, "then", $.expression, "else", $.expression)
      ),
    ),

    while_expr: $ => seq("while", $.expression, "do", $.expression),

    for_expr: $ => seq(
      "for", $.identifier, ":=", $.expression, "to", $.expression, "do",
      $.expression
    ),

    let_expr: $ => choice(
      seq("let", $.declaration, "in", "end"),
      seq("let", $.declaration, "in", $.expression, "end"),
      seq("let", $.declaration, "in",
        seq($.expression, repeat1(seq(";", $.expression))),
        "end"),
    ),

    // apply to int type expr
    arithmetic_expr: $ => choice(
      prec.left(6, seq($._simple_expression, "*", $._simple_expression)),
      prec.left(6, seq($._simple_expression, "/", $._simple_expression)),
      prec.left(5, seq($._simple_expression, "+", $._simple_expression)),
      prec.left(5, seq($._simple_expression, "-", $._simple_expression)),
    ),

    // apply to int and string type expr
    compare_expr: $ => choice(
      prec(4, seq($._simple_expression, "=", $._simple_expression)),
      prec(4, seq($._simple_expression, "<>", $._simple_expression)),
      prec(4, seq($._simple_expression, ">", $._simple_expression)),
      prec(4, seq($._simple_expression, "<", $._simple_expression)),
      prec(4, seq($._simple_expression, ">=", $._simple_expression)),
      prec(4, seq($._simple_expression, "<=", $._simple_expression)),
    ),

    _simple_expression: $ => choice(
      $.int_literal,
      $.string_literal,
      $.arithmetic_expr,
      $.boolean_expr,
      prec(7, seq("-", $._simple_expression)),
    ),

    boolean_expr: $ => choice(
      prec.left(3, seq($._simple_expression, "&", $._simple_expression)),
      prec.left(2, seq($._simple_expression, "|", $._simple_expression)),
    ),

    array_expr: $ => seq($.type_id, "[", $.expression, "]", "of", $.expression),
  }
});
