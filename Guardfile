# A sample Guardfile
# More info at https://github.com/guard/guard#readme

# Add files and commands to this file, like the example:
#   watch(%r{file/path}) { `command(s)` }
#
guard :shell do
  watch('index.jade') { |m| `jade -P index.jade` }
  watch('css/style.scss') { |m| `sass css/style.scss css/style.css` }
end
