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
    // a source_file is just an expression
    source_file: $ => $._binary_expression,

    comment: $ => seq("/*", optional($.comment_block), "*/"),

    identifier: _ => /[a-zA-Z][a-zA-Z0-9_]*/,
    // what is the actual type_id naming requirements?
    type_id: $ => $.identifier,
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

    declaration: $ => repeat1(choice(
      $.variable_dec, $.function_dec, $.type_dec
    )),

    variable_dec: $ => seq("var", $.identifier,
      optional(seq(":", $.type_id)), ":=", $._binary_expression
    ),

    function_dec: $ => seq(
      "function", $.identifier, "(", optional($.type_fields), ")",
      optional(seq(":", $.type_id)), "=", $._binary_expression
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

    _primary_expression: $ => choice(
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
      seq(
        "(", $._binary_expression,
        repeat1(seq(";", $._binary_expression)), ")"
      ),
      $.int_literal,
      $.string_literal,
      $.array_expr,
      seq("(", optional($._binary_expression), ")"),
    ),

    _unary_expression: $ => choice(
      seq("-", $._unary_expression), $._primary_expression
    ),

    // Left recursion makes arithmetic and boolean operators left-associative;
    // their right operands come from the next tighter level. Precedence
    // annotations resolve boundaries with open-ended primary expressions,
    // while the hidden rules shift to keep operators inside those bodies.
    _mul_expression: $ => prec.right(choice(
      $.mul_expression, $._unary_expression
    )),
    mul_expression: $ => prec.left(6, seq(
      $._mul_expression, choice("*", "/"), $._unary_expression
    )),

    _add_expression: $ => prec.right(choice(
      $.add_expression, $._mul_expression
    )),
    add_expression: $ => prec.left(5, seq(
      $._add_expression, choice("+", "-"), $._mul_expression
    )),

    _compare_expression: $ => prec.right(choice(
      $.compare_expression, $._add_expression
    )),
    // Neither operand recurses into comparison: parentheses are required
    // to compare the result of another comparison.
    compare_expression: $ => prec(4, seq(
      $._add_expression,
      choice("=", "<>", ">", "<", ">=", "<="),
      $._add_expression,
    )),

    _and_expression: $ => prec.right(choice(
      $.and_expression, $._compare_expression
    )),
    and_expression: $ => prec.left(3, seq(
      $._and_expression, "&", $._compare_expression
    )),

    _or_expression: $ => prec.right(choice(
      $.or_expression, $._and_expression
    )),
    or_expression: $ => prec.left(2, seq(
      $._or_expression, "|", $._and_expression
    )),

    // Open-ended bodies (assignment, if, loops, array initialization)
    // consume the complete expression that follows them.
    _binary_expression: $ => prec.right($._or_expression),

    lvalue: $ => choice(
      $.identifier,
      seq($.lvalue, ".", $.identifier),
      seq($.lvalue, "[", $._binary_expression, "]"),
    ),

    assignment: $ => prec(1, seq($.lvalue, ":=", $._binary_expression)),

    record: $ => choice(
      seq($.type_id, "{", "}"),
      seq($.type_id, "{",
        $.identifier, "=", $._binary_expression,
        repeat(seq(",", $.identifier, "=", $._binary_expression)),
        "}"
      )
    ),

    function_call: $ => choice(
      seq($.identifier, "(", ")"),
      seq($.identifier, "(",
          $._binary_expression, repeat(seq(",", $._binary_expression)),
        ")"),
    ),

    if_expr: $ => choice(
      prec.right(seq("if", $._binary_expression, "then", $._binary_expression)),
      prec.right(
        seq(
          "if", $._binary_expression, "then", $._binary_expression,
          "else", $._binary_expression
        )
      ),
    ),

    while_expr: $ => seq(
      "while", $._binary_expression, "do", $._binary_expression
    ),

    for_expr: $ => seq(
      "for", $.identifier, ":=", $._binary_expression,
      "to", $._binary_expression, "do", $._binary_expression
    ),

    let_expr: $ => choice(
      seq("let", optional($.declaration), "in", "end"),
      seq("let", optional($.declaration), "in", $._binary_expression, "end"),
      seq("let", optional($.declaration), "in",
        seq($._binary_expression, repeat1(seq(";", $._binary_expression))),
        "end"),
    ),

    array_expr: $ => seq(
      $.type_id, "[", $._binary_expression, "]", "of", $._binary_expression
    ),
  }
});
