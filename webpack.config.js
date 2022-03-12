const path = require('path');
const webpack = require('webpack')

module.exports = {
    entry: {
        arib: './web/index.ts',
        video_list: './web/video_list.tsx',
        remote_controller: './web/remote_controller_ui.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
            },
            {
                test: /default\.css$/,
                type: 'asset/source',
            }
        ],
    },
    resolve: {
        extensions: [
            '.ts', '.js', '.tsx'
        ],
        fallback: {
            fs: false,
            path: false,
            url: false,
            // babelのため
            process: require.resolve('process/browser'),
            Buffer: require.resolve('buffer'),
        },
    },
    mode: 'development',
    devtool: 'source-map',
    // babelのため
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: 'buffer',
        }),
    ],
};
