import type { SupportedLanguage } from "../constants/languages";

const STARTER_CODE: Record<SupportedLanguage, string> = {
  python: `def fibonacci(n: int) -> list[int]:
    """Return the first n Fibonacci numbers."""
    seq = [0, 1]
    while len(seq) < n:
        seq.append(seq[-1] + seq[-2])
    return seq


print(fibonacci(10))
`,
  java: `public class Main {
    public static void main(String[] args) {
        String[] langs = {"Java", "Python", "Go"};

        for (String lang : langs) {
            System.out.println(lang);
        }
    }
}
`,
  javascript: `// AI autocomplete: type slowly and press Tab to accept the ghost text.
function sum(numbers) {
  let total = 0;

  for (const n of numbers) {
  }

  return total;
}

console.log(sum([1, 2, 3]));
`,
  typescript: `interface User {
  id: number;
  name: string;
}

function greet(user: User): string {
  
}

console.log(greet({ id: 1, name: "Ada" }));
`,
  c: `#include <stdio.h>

int main(void) {
    int values[] = {3, 7, 2, 9};
    int max = values[0];

    for (int i = 1; i < 4; i++) {
    }

    printf("%d\\n", max);
    return 0;
}
`,
  cpp: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> nums = {5, 1, 4};
    int largest = nums[0];

    for (size_t i = 1; i < nums.size(); i++) {
    }

    std::cout << largest << std::endl;
    return 0;
}
`,
  html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Demo</title>
  </head>
  <body>
    <h1>Hello</h1>
    <p></p>
  </body>
</html>
`,
  css: `:root {
  --accent: #4f46e5;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
}

.button {
  
}
`,
  sql: `SELECT
    c.name,
    COUNT(o.id) AS order_count
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.created_at >= '2026-01-01'
GROUP BY c.name
`,
  go: `package main

import "fmt"

func main() {
    names := []string{"ada", "linus", "grace"}

    for _, n := range names {
    }

    fmt.Println(len(names))
}
`,
  rust: `fn main() {
    let words = vec!["alpha", "beta", "gamma"];

    for w in &words {
    }

    println!("{}", words.len());
}
`,
  php: `<?php

$items = ["pen", "book", "lamp"];

foreach ($items as $item) {
}

echo count($items);
`,
  json: `{
  "name": "ai-code-editor",
  "version": "1.0.0",
  "scripts": {}
}
`,
};

export function starterCode(language: SupportedLanguage): string {
  return STARTER_CODE[language];
}
