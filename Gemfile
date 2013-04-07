source 'https://rubygems.org'

gem 'rails', '3.2.13.rc1'

gem 'unicorn'
gem "newrelic_rpm", "~> 3.5.7.57.beta"

gem 'ember-rails'
gem 'emblem-rails'

# Gems used only for assets and not required
# in production environments by default.
group :assets do
  gem 'sass-rails',   '~> 3.2.3'
  # gem 'coffee-rails', '~> 3.2.1'
  gem 'uglifier', '>= 1.0.3'
end

group :development, :test do
  gem 'qunit-rails'
  gem 'debugger'
  gem 'sqlite3'
end

group :production do
  gem 'pg'
end