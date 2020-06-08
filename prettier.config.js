module.exports = {
  printWidth: 100,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'none',
  arrowParens: 'avoid', // (x) => {} 箭头函数参数只有一个时是否要有小括号。avoid：省略括号
  bracketSpacing: true, // 在对象，数组括号与文字之间加空格 "{ foo: bar }"
  disableLanguages: ['vue'], // 不格式化vue文件 vue文件的格式化单独设置
  endOfLine: 'auto', // 结尾是 \n \r \n\r auto
  htmlWhitespaceSensitivity: 'ignore',
  ignorePath: '.prettierignore', // 不使用prettier格式化的文件填写在项目的.prettierignore文件中
  parser: 'babel', // 格式化的解析器，默认是babylon 2.0版本之后改为了babel
  requireConfig: false, // Require a 'prettierconfig' to format prettier
  stylelintIntegration: false, // 不让prettier使用stylelint的代码格式进行校验
  eslintIntegration: false, // 不让prettier使用eslint的代码格式进行校验
  tslintIntegration: false // 不让prettier使用tslint的代码格式进行校验
};
