require 'imagine_breaker'

require 'rubygems'
require 'RMagick'

class Wave < ImagineBreaker
  def break!
    image = Magick::Image.from_blob(@file_data).shift
    new_image = image.wave(3, 25)
    @file_data = new_image.to_blob
  end
end

