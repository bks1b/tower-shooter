const { DefinePlugin } = require('webpack');
const { join } = require('path');

module.exports = [{
    mode: 'none',
    entry: {
        site: join(process.cwd(), 'src/client/site/index.tsx'),
        game: join(process.cwd(), 'src/client/game/index.ts'),
    },
    target: 'web',
    resolve: { extensions: ['.js', '.ts', '.jsx', '.tsx'] },
    module: {
        rules: [{
            loader: 'ts-loader',
            test: /\.tsx?$/,
            options: { allowTsInNodeModules: true },
        }],
    },
    output: {
        filename: '[name].js',
        path: join(process.cwd(), 'build'),
    },
    plugins: [new DefinePlugin({ 'process.env': '({})' })],
}];